"""
AI services: Claude for cooking guidance and recipe import.
Uses schemas/recipe.json and import_prompts for webpage import.
"""

import json
import re
from datetime import datetime
from pathlib import Path

from django.conf import settings

from .models import RecipeVersion
from .import_prompts import (
    get_recipe_import_system_prompt,
    user_prompt_webpage,
    KOREAN_RECIPE_INSTRUCTIONS,
)
from .voice_prompts import VOICE_COMMAND_SYSTEM_PROMPT, get_voice_command_user_prompt


def _get_client():
    """Lazy Anthropic client; returns None if no API key."""
    if not getattr(settings, 'ANTHROPIC_API_KEY', None):
        return None
    try:
        from anthropic import Anthropic
        return Anthropic()
    except Exception:
        return None


def _load_recipe_schema():
    """Load schemas/recipe.json from repo root if present."""
    try:
        base = Path(settings.BASE_DIR)
        # ForkLog/schemas/recipe.json when BASE_DIR is backend
        schema_path = base.parent / 'schemas' / 'recipe.json'
        if schema_path.exists():
            return schema_path.read_text(encoding='utf-8')
    except Exception:
        pass
    return None


def _normalize_import_result(data):
    """Normalize Claude recipe JSON to API shape: name, metadata, title, ingredients, steps, equipment, notes, nutrition, tags."""
    name = data.get('name') or (data.get('metadata') or {}).get('title') or 'Imported Recipe'
    metadata = data.get('metadata') or {}
    if not metadata.get('title'):
        metadata['title'] = name
    return {
        'name': name,
        'metadata': metadata,
        'title': metadata.get('title', name),
        'ingredients': data.get('ingredients', []),
        'steps': data.get('steps', []),
        'equipment': data.get('equipment', []),
        'notes': data.get('notes', []),
        'nutrition': data.get('nutrition'),
        'tags': data.get('tags', []),
    }


def _format_ingredient(ing):
    """Format one ingredient for context; supports schema and legacy shapes."""
    if isinstance(ing, str):
        return f'  - {ing}'
    # Schema: id, name, quantity, unit, preparation, notes, group, optional
    name = ing.get('name', '')
    quantity = ing.get('quantity')
    unit = ing.get('unit', '')
    preparation = ing.get('preparation', '')
    notes = ing.get('notes', '')
    # Legacy: amount, unit, name, note
    if quantity is None and 'amount' in ing:
        quantity = ing.get('amount', '')
    if not name and 'name' not in ing:
        name = str(ing.get('amount', ''))
    s = '  - '
    if quantity is not None and quantity != '':
        s += f'{quantity} '
    if unit:
        s += f'{unit} '
    s += name or '?'
    if preparation:
        s += f', {preparation}'
    if notes:
        s += f' ({notes})'
    return s


def _step_text(step, index):
    """Extract display text from a step (schema instruction or legacy text)."""
    if isinstance(step, str):
        return step
    return step.get('instruction') or step.get('text', '')


def ai_guide_message(message, recipe_version=None, current_step_index=0, log_entries=None):
    """
    Get Claude's reply for cooking guidance.
    Returns (reply_text, error_string). error_string is None on success.
    """
    client = _get_client()
    if not client:
        return None, 'ANTHROPIC_API_KEY not set. Add it to .env to enable AI guidance.'

    log_entries = log_entries or []
    system = (
        'You are a friendly cooking assistant for ForkLog, an app that helps people '
        'cook from versioned recipes. Guide the user through the current step, answer '
        'questions about technique or substitutions, and keep responses concise and practical. '
        'If the user is following a recipe, reference the current step when relevant.'
    )
    parts = []

    if recipe_version:
        title = (recipe_version.metadata or {}).get('title') or recipe_version.title or recipe_version.recipe.name
        steps = recipe_version.steps or []
        ingredients = recipe_version.ingredients or []
        cur = steps[current_step_index] if current_step_index < len(steps) else None
        context = f'Recipe: {title}\n'
        if ingredients:
            context += 'Ingredients:\n' + '\n'.join(_format_ingredient(i) for i in ingredients) + '\n'
        if steps:
            context += 'Steps:\n'
            for i, s in enumerate(steps):
                text = _step_text(s, i)
                marker = ' (current)' if i == current_step_index else ''
                context += f"  {i + 1}. {text}{marker}\n"
        if cur:
            context += f'\nUser is currently on step {current_step_index + 1}. '
        parts.append({'type': 'text', 'text': context})
    for entry in log_entries[-10:]:
        role = entry.get('role', 'user')
        content = entry.get('content', '')
        if role == 'user':
            parts.append({'type': 'text', 'text': f'User: {content}\n'})
        else:
            parts.append({'type': 'text', 'text': f'Assistant: {content}\n'})
    parts.append({'type': 'text', 'text': f'User: {message}\n\nAssistant:'})

    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=1024,
            system=system,
            messages=[{'role': 'user', 'content': parts}],
        )
        reply = response.content[0].text if response.content else ''
        return reply.strip(), None
    except Exception as e:
        return None, str(e)


def _parse_recipe_response_text(text: str):
    """Strip markdown/code fences and parse JSON from Claude response."""
    text = re.sub(r'^```(?:json)?\s*', '', text.strip())
    text = re.sub(r'\s*```\s*$', '', text)
    return json.loads(text)


def ai_import_recipe_from_webpage(url: str, content: str, language: str = 'en'):
    """
    Import recipe from webpage content using the recipe extraction specialist prompts.
    Uses RECIPE_IMPORT_SYSTEM_PROMPT, user_prompt_webpage, and Korean instructions when language is "ko".
    Returns (normalized_dict, error_string). Normalized dict has name, metadata, title, ingredients, steps, equipment, notes, nutrition, tags.
    """
    client = _get_client()
    if not client:
        return None, 'ANTHROPIC_API_KEY not set. Add it to .env to enable recipe import.'

    schema_json = _load_recipe_schema()
    system_prompt = get_recipe_import_system_prompt(schema_json)
    user_prompt = user_prompt_webpage(url, content, language)
    if language and language.lower() == 'ko':
        user_prompt += KOREAN_RECIPE_INSTRUCTIONS

    # Truncate content to avoid token limits
    content = content[:50000] if len(content) > 50000 else content

    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=4096,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_prompt}],
        )
        text = response.content[0].text if response.content else ''
        data = _parse_recipe_response_text(text)
        # Ensure source is set for webpage
        metadata = data.get('metadata') or {}
        if 'source' not in metadata:
            metadata['source'] = {
                'type': 'webpage',
                'url': url,
                'imported_at': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
        else:
            metadata['source']['type'] = 'webpage'
            metadata['source']['url'] = url
            metadata['source']['imported_at'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        data['metadata'] = metadata
        return _normalize_import_result(data), None
    except json.JSONDecodeError as e:
        return None, f'Failed to parse recipe JSON: {e}'
    except Exception as e:
        return None, str(e)


def ai_import_recipe(source):
    """
    Parse recipe from plain text or URL using Claude (legacy / paste flow).
    Returns (structured_dict, error_string) matching schemas/recipe.json where possible.
    For webpage-specific extraction with language and schema prompts, use ai_import_recipe_from_webpage.
    """
    client = _get_client()
    if not client:
        return None, 'ANTHROPIC_API_KEY not set. Add it to .env to enable recipe import.'

    prompt = f'''Parse the following recipe into structured JSON. The source may be raw recipe text or a URL (if URL, treat the content as already fetched).

Source:
{source[:15000]}

Respond with ONLY a single JSON object, no markdown or explanation. Prefer this schema when you can:
- "metadata": object with "title" (required), "language" (ISO 639-1: "en"|"ko"|"ja"|"es"|"fr"|"de"|"it"|"zh"|"pt"), "translated_title" (English translation if title is in another language), "description", "source" (object with "type": "webpage"|"instagram"|"youtube"|"manual"|"voice", "url", "author", "imported_at"), "cuisine", "course" ("appetizer"|"main"|"side"|"dessert"|"beverage"|"snack"), "dietary_tags" (array), "prep_time_minutes", "cook_time_minutes", "total_time_minutes", "servings", "difficulty" ("easy"|"medium"|"hard"), "rating".
- "ingredients": array of objects with "id" (e.g. "ing_001"), "name" (required), "quantity", "unit", "preparation", "notes", "group", "optional".
- "steps": array of objects with "id" (e.g. "step_001"), "order", "instruction" (required), "duration_minutes", "temperature" (object with "value", "unit" "F"|"C"), "timer", "notes", "media".
- "equipment": array of strings.
- "notes": array of objects with "type" ("tip"|"substitution"|"storage"|"variation"|"warning"), "content".
- "nutrition": object with "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg".
- "tags": array of strings.

Also include a top-level "name" (short name for the recipe). Use empty string or omit optional fields. Generate simple ids like "ing_001", "step_001" for ingredients and steps.
'''

    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=2048,
            messages=[{'role': 'user', 'content': prompt}],
        )
        text = response.content[0].text if response.content else ''
        data = _parse_recipe_response_text(text)
        return _normalize_import_result(data), None
    except json.JSONDecodeError as e:
        return None, f'Failed to parse recipe JSON: {e}'
    except Exception as e:
        return None, str(e)


# ---------- Voice command handling ----------


def recipe_version_to_recipe_json(recipe_version):
    """
    Build a schema-shaped recipe dict from a RecipeVersion (and its Recipe) for voice/modification prompts.
    Includes id (recipe uuid), version block, metadata, ingredients, steps, equipment, notes, nutrition, tags.
    """
    recipe = recipe_version.recipe
    metadata = dict(recipe_version.metadata or {})
    if recipe_version.title and not metadata.get('title'):
        metadata['title'] = recipe_version.title
    notes = getattr(recipe_version, 'notes_array', None) or []
    if not notes and getattr(recipe_version, 'notes', None) and (recipe_version.notes or '').strip():
        notes = [{'type': 'tip', 'content': recipe_version.notes}]
    return {
        'id': str(recipe.uuid),
        'version': {
            'number': recipe_version.version_semver or str(recipe_version.version_number),
            'created_at': recipe_version.created_at.isoformat() if recipe_version.created_at else None,
            'parent_version': str(recipe_version.parent_version_id) if recipe_version.parent_version_id else None,
            'commit_message': recipe_version.commit_message or recipe_version.message or '',
            'author': recipe_version.author or '',
        },
        'metadata': metadata,
        'ingredients': recipe_version.ingredients or [],
        'steps': recipe_version.steps or [],
        'equipment': recipe_version.equipment or [],
        'notes': notes,
        'nutrition': recipe_version.nutrition,
        'tags': recipe_version.tags or [],
    }


def process_voice_command(voice_transcription, current_recipe, conversation_history=None):
    """
    Process a voice command to modify a recipe. Calls Claude with voice prompt templates.
    Returns (result_dict, error_string). result_dict has action, intent, updated_recipe (when applicable),
    commit_message, confirmation, questions, version_bump, and optional target/changes/warnings.
    """
    client = _get_client()
    if not client:
        return None, 'ANTHROPIC_API_KEY not set. Add it to .env to enable voice commands.'

    schema_json = _load_recipe_schema()
    system_prompt = VOICE_COMMAND_SYSTEM_PROMPT
    if schema_json:
        system_prompt += f"\n\nRecipe Schema (output must conform):\n{schema_json[:12000]}"
    recipe_dict = current_recipe if isinstance(current_recipe, dict) else recipe_version_to_recipe_json(current_recipe)
    user_prompt = get_voice_command_user_prompt(voice_transcription, recipe_dict, schema_json=None)

    messages = list(conversation_history or [])
    messages.append({'role': 'user', 'content': user_prompt})

    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
        )
        text = response.content[0].text if response.content else ''
        data = _parse_recipe_response_text(text)
        if data.get('updated_recipe') and not data.get('version_bump'):
            data['version_bump'] = determine_version_bump(
                data.get('action', ''), data.get('intent', '')
            )
        return data, None
    except json.JSONDecodeError as e:
        return None, f'Failed to parse voice command response: {e}'
    except Exception as e:
        return None, str(e)


def determine_version_bump(action, intent):
    """
    Determine semantic version bump based on modification type.
    Major: scaling. Minor: add/remove ingredients or steps. Patch: small adjustments.
    """
    if action == 'scale_recipe':
        return 'major'
    if intent in ('ADD', 'REMOVE', 'REPLACE', 'ADD_STEP', 'REMOVE_STEP', 'REORDER_STEPS'):
        return 'minor'
    return 'patch'


def bump_version(current_semver, bump_type):
    """Apply semantic version bump. current_semver e.g. '1.2.0' or '1' -> '1.0.0'."""
    parts = (current_semver or '1.0.0').replace('v', '').strip().split('.')
    major = int(parts[0]) if parts else 1
    minor = int(parts[1]) if len(parts) > 1 else 0
    patch = int(parts[2]) if len(parts) > 2 else 0
    if bump_type == 'major':
        return f'{major + 1}.0.0'
    if bump_type == 'minor':
        return f'{major}.{minor + 1}.0'
    return f'{major}.{minor}.{patch + 1}'
