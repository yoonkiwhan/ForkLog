"""
Recipe and version-control models for ForkLog.
Structured to match schemas/recipe.json.
Recipes are owned by users (django.contrib.auth.User); slug is unique per owner.
"""

import uuid
from django.conf import settings
from django.db import models


class Recipe(models.Model):
    """Top-level recipe (logical entity); versions hold the actual content. Tied to an owner (user)."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipes',
        null=True,
        blank=True,
    )
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['slug'],
                condition=models.Q(owner__isnull=True),
                name='recipes_slug_unique_null_owner',
            ),
            models.UniqueConstraint(
                fields=['owner', 'slug'],
                condition=models.Q(owner__isnull=False),
                name='recipes_owner_slug_unique',
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base = slugify(self.name) or 'recipe'
            self.slug = base
            n = 1
            qs = Recipe.objects.exclude(pk=self.pk)
            if self.owner_id is not None:
                qs = qs.filter(owner_id=self.owner_id)
            else:
                qs = qs.filter(owner__isnull=True)
            while qs.filter(slug=self.slug).exists():
                self.slug = f'{base}-{n}'
                n += 1
        super().save(*args, **kwargs)


class RecipeVersion(models.Model):
    """
    A single version of a recipe. Matches schemas/recipe.json:
    version (semver, parent, commit_message, author), metadata, ingredients, steps,
    equipment, notes (array), nutrition, tags.
    """
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    # version block (schema)
    version_semver = models.CharField(max_length=32, blank=True)  # e.g. "1.2.0"
    parent_version = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    commit_message = models.CharField(max_length=255, blank=True)
    author = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    title = models.CharField(max_length=255, blank=True)  # denormalized from metadata.title
    # metadata (schemas/recipe.json): title, language (ISO 639-1), translated_title, description, source,
    # cuisine, course, dietary_tags, prep/cook/total_time_minutes, servings, difficulty, rating
    metadata = models.JSONField(default=dict, blank=True)
    # ingredients: [{ id, name, quantity, unit, preparation, notes, group, optional }]
    ingredients = models.JSONField(default=list, blank=True)
    # steps: [{ id, order, instruction, duration_minutes, temperature, timer, notes, media }]
    steps = models.JSONField(default=list, blank=True)
    equipment = models.JSONField(default=list, blank=True)  # list of strings
    # notes: [{ type: "tip"|"substitution"|"storage"|"variation"|"warning", content }]
    notes_array = models.JSONField(default=list, blank=True)
    nutrition = models.JSONField(default=None, null=True, blank=True)  # per-serving
    tags = models.JSONField(default=list, blank=True)  # list of strings

    # Legacy fields (kept for migration/compat; prefer metadata, notes_array, commit_message)
    notes = models.TextField(blank=True)
    message = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['recipe', '-version_number']
        unique_together = [['recipe', 'version_number']]

    def __str__(self):
        return f'{self.recipe.name} v{self.version_number}'


class CookingSession(models.Model):
    """A cooking run: user follows a recipe version with AI guidance. Maps to schema cooking_log items."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cooking_sessions',
        null=True,
        blank=True,
    )
    recipe_version = models.ForeignKey(
        RecipeVersion, on_delete=models.CASCADE, related_name='cooking_sessions'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    current_step_index = models.PositiveIntegerField(default=0)
    log_entries = models.JSONField(default=list)
    session_notes = models.TextField(blank=True)
    # Actual time spent per step (seconds), by step index. e.g. [120, 90, 300] = 2min, 1.5min, 5min for steps 0,1,2.
    step_durations_seconds = models.JSONField(default=list, blank=True)
    # schema cooking_log fields
    rating = models.FloatField(null=True, blank=True)
    modifications = models.TextField(blank=True)
    photos = models.JSONField(default=list, blank=True)  # list of URLs

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'Cooking {self.recipe_version} at {self.started_at}'


class ParsedRecipeCache(models.Model):
    """
    Public cache of URL → parsed recipe (from AI import). Any user requesting the same
    URL gets the cached result instead of calling the AI API again.
    """
    url = models.URLField(max_length=2048, help_text='Original URL as submitted')
    normalized_url = models.CharField(max_length=2048, unique=True, db_index=True)
    result = models.JSONField(help_text='Normalized import result: name, metadata, ingredients, steps, etc.')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Parsed recipe cache'
        verbose_name_plural = 'Parsed recipe cache'

    def __str__(self):
        return self.normalized_url[:80] + ('…' if len(self.normalized_url) > 80 else '')
