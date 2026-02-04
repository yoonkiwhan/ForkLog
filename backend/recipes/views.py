"""
API views for recipes, versions, and cooking sessions.
"""

from django.db import models
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Recipe, RecipeVersion, CookingSession
from .serializers import (
    RecipeSerializer,
    RecipeListSerializer,
    RecipeVersionSerializer,
    RecipeVersionListSerializer,
    CookingSessionSerializer,
    CookingSessionCreateSerializer,
)
from .services import (
    ai_guide_message,
    ai_import_recipe,
    ai_import_recipe_from_webpage,
    process_voice_command,
    recipe_version_to_recipe_json,
    bump_version,
)


def _recipes_for_user(request):
    """Recipes owned by the current user (for authenticated users)."""
    if request.user.is_authenticated:
        return Recipe.objects.filter(owner=request.user).prefetch_related('versions')
    return Recipe.objects.none()


# ---------- Recipe CRUD ----------


class RecipeListCreate(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _recipes_for_user(self.request)

    def get_serializer_class(self):
        return RecipeListSerializer if self.request.method == 'GET' else RecipeSerializer

    def perform_create(self, serializer):
        recipe = serializer.save(owner=self.request.user)
        data = self.request.data
        # Build initial version from body (schema or legacy shape)
        metadata = data.get('metadata') or {}
        title = metadata.get('title') or data.get('title') or recipe.name
        ingredients = data.get('ingredients', [])
        steps = data.get('steps', [])
        notes_array = data.get('notes') if isinstance(data.get('notes'), list) else None
        notes_legacy = data.get('notes', '') if isinstance(data.get('notes'), str) else ''
        if not notes_array and notes_legacy:
            notes_array = [{'type': 'tip', 'content': notes_legacy}]
        equipment = data.get('equipment', [])
        nutrition = data.get('nutrition')
        tags = data.get('tags', [])
        if ingredients or steps or metadata or tags:
            RecipeVersion.objects.create(
                recipe=recipe,
                version_number=1,
                version_semver='1.0.0',
                title=title,
                metadata={**metadata, 'title': title},
                ingredients=ingredients,
                steps=steps,
                equipment=equipment,
                notes_array=notes_array or [],
                nutrition=nutrition,
                tags=tags,
                notes=notes_legacy,
                commit_message=data.get('commit_message') or 'Initial version',
                message=data.get('message') or 'Initial version',
                author=data.get('author', ''),
            )


class RecipeDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        return _recipes_for_user(self.request)


# ---------- Recipe versions ----------


class RecipeVersionList(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecipeVersion.objects.filter(
            recipe__slug=self.kwargs['slug'],
            recipe__owner=self.request.user,
        ).order_by('-version_number')

    def get_serializer_class(self):
        return RecipeVersionListSerializer if self.request.method == 'GET' else RecipeVersionSerializer

    def perform_create(self, serializer):
        recipe = Recipe.objects.get(slug=self.kwargs['slug'], owner=self.request.user)
        next_num = (recipe.versions.aggregate(
            mx=models.Max('version_number')
        ).get('mx') or 0) + 1
        serializer.save(recipe=recipe, version_number=next_num)


class RecipeVersionDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RecipeVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecipeVersion.objects.filter(
            recipe__slug=self.kwargs['slug'],
            recipe__owner=self.request.user,
        )


# ---------- Cooking sessions ----------


class CookingSessionListCreate(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CookingSession.objects.filter(
            recipe_version__recipe__slug=self.kwargs['slug'],
            recipe_version__recipe__owner=self.request.user,
        ).select_related('recipe_version').order_by('-started_at')

    def get_serializer_class(self):
        return CookingSessionSerializer if self.request.method == 'GET' else CookingSessionCreateSerializer

    def create(self, request, *args, **kwargs):
        slug = kwargs.get('slug')
        version_id = request.data.get('recipe_version')
        version = RecipeVersion.objects.filter(
            recipe__slug=slug, recipe__owner=request.user, id=version_id
        ).first()
        if not version:
            return Response(
                {'error': 'Recipe version not found for this recipe.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        session = CookingSession.objects.create(
            recipe_version=version,
            current_step_index=request.data.get('current_step_index', 0),
            log_entries=request.data.get('log_entries', []),
            session_notes=request.data.get('session_notes', ''),
            rating=request.data.get('rating'),
            modifications=request.data.get('modifications', ''),
            photos=request.data.get('photos', []),
        )
        return Response(
            CookingSessionSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )


class CookingSessionDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CookingSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CookingSession.objects.filter(
            recipe_version__recipe__slug=self.kwargs['slug'],
            recipe_version__recipe__owner=self.request.user,
        ).select_related('recipe_version')


# ---------- AI endpoints ----------


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_guide(request):
    """
    Send user message and optional context; return Claude's cooking guidance.
    Body: { "message": "...", "recipe_version": id?, "current_step_index": int?, "log_entries": [...] }
    """
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
    version_id = request.data.get('recipe_version')
    current_step_index = request.data.get('current_step_index', 0)
    log_entries = request.data.get('log_entries', [])

    recipe_version = None
    if version_id:
        recipe_version = RecipeVersion.objects.filter(id=version_id).select_related('recipe').first()

    reply, err = ai_guide_message(
        message=message,
        recipe_version=recipe_version,
        current_step_index=current_step_index,
        log_entries=log_entries,
    )
    if err:
        return Response({'error': err}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'reply': reply})


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_import(request):
    """
    Import a recipe using Claude.

    **Webpage import (preferred when you have URL + scraped content):**
    Body: { "url": "https://...", "content": "scraped HTML or text", "language": "en"|"ko"|"ja"|... }
    Uses recipe extraction specialist prompts and schema. For Korean, appends Korean-specific instructions.

    **Legacy / paste:**
    Body: { "source": "raw recipe text or URL" }
    Returns structured recipe: name, metadata, title, ingredients, steps, equipment, notes, nutrition, tags.
    """
    url = request.data.get('url', '').strip()
    content = request.data.get('content', '')
    language = (request.data.get('language') or 'en').strip() or 'en'
    source = request.data.get('source', '').strip()

    if url and content is not None:
        # Webpage import: use specialist prompts and optional schema
        result, err = ai_import_recipe_from_webpage(url, content, language)
    elif source:
        # Legacy: paste or single URL/text
        result, err = ai_import_recipe(source)
    else:
        return Response(
            {'error': 'Provide either (url + content) for webpage import or source for paste/URL.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if err:
        return Response({'error': err}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_voice_command(request):
    """
    Process a voice command to modify a recipe (transcription already done, e.g. via Whisper).

    Body:
    - "transcription" or "voice_text": the transcribed voice command
    - "recipe": full recipe JSON (schema-shaped), OR
    - "recipe_version_id": id of RecipeVersion to load (recipe slug required for permission/lookup)
    - "recipe_slug": required when using recipe_version_id
    - "conversation_history": optional list of { "role": "user"|"assistant", "content": "..." }

    Returns:
    - action, intent, updated_recipe (when not request_clarification), commit_message,
      confirmation, questions, version_bump, and optional target, changes, warnings.
    To persist: create a new RecipeVersion from updated_recipe (e.g. POST to versions with
    the returned fields) and use commit_message as version message; use bump_version(
    current_version, result["version_bump"]) for version_semver.
    """
    transcription = (request.data.get('transcription') or request.data.get('voice_text') or '').strip()
    if not transcription:
        return Response(
            {'error': 'transcription or voice_text is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipe_data = request.data.get('recipe')
    recipe_version_id = request.data.get('recipe_version_id')
    recipe_slug = request.data.get('recipe_slug', '').strip()

    if recipe_data and isinstance(recipe_data, dict):
        current_recipe = recipe_data
    elif recipe_version_id and recipe_slug:
        qs = RecipeVersion.objects.filter(
            recipe__slug=recipe_slug, id=recipe_version_id
        ).select_related('recipe')
        if request.user.is_authenticated:
            qs = qs.filter(recipe__owner=request.user)
        version = qs.first()
        if not version:
            return Response(
                {'error': 'Recipe version not found for this recipe.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        current_recipe = recipe_version_to_recipe_json(version)
    else:
        return Response(
            {'error': 'Provide either recipe (full JSON) or (recipe_version_id + recipe_slug).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    conversation_history = request.data.get('conversation_history')
    result, err = process_voice_command(
        transcription, current_recipe, conversation_history=conversation_history
    )
    if err:
        return Response({'error': err}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    # Suggest next semantic version when we have updated_recipe and current version
    if result.get('updated_recipe') and result.get('version_bump'):
        current_ver = (current_recipe.get('version') or {}).get('number') or '1.0.0'
        result['suggested_next_version'] = bump_version(current_ver, result['version_bump'])
    return Response(result)


# ---------- Auth / current user ----------


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return the currently authenticated user (id, username)."""
    user = request.user
    return Response({
        'id': user.pk,
        'username': user.username,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user. Body: { "username": "...", "password": "..." }
    Returns { "user": { "id", "username" }, "token": "..." }.
    """
    from django.contrib.auth.models import User
    from rest_framework.authtoken.models import Token

    username = (request.data.get('username') or '').strip()
    password = request.data.get('password')
    if not username or not password:
        return Response(
            {'error': 'username and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'A user with that username already exists.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'user': {'id': user.pk, 'username': user.username},
        'token': token.key,
    }, status=status.HTTP_201_CREATED)


# ---------- Google OAuth (django-allauth) ----------


def google_oauth_start(request):
    """Redirect to Google OAuth. Frontend sends users here (e.g. GET /api/auth/google/)."""
    from django.shortcuts import redirect
    next_url = request.GET.get('next') or '/api/auth/google/complete/'
    return redirect(f'/accounts/google/login/?next={next_url}')


def google_oauth_complete(request):
    """
    Called after Google OAuth login (LOGIN_REDIRECT_URL). User has session.
    Issue or fetch DRF Token and redirect to frontend with token in query.
    """
    from django.conf import settings
    from django.shortcuts import redirect
    from rest_framework.authtoken.models import Token

    if not request.user.is_authenticated:
        frontend_url = getattr(settings, 'FRONTEND_AUTH_CALLBACK_URL', 'http://localhost:5173/auth/callback')
        return redirect(f'{frontend_url}?error=not_authenticated')
    token, _ = Token.objects.get_or_create(user=request.user)
    frontend_url = getattr(settings, 'FRONTEND_AUTH_CALLBACK_URL', 'http://localhost:5173/auth/callback')
    return redirect(f'{frontend_url}?token={token.key}')
