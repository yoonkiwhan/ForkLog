"""
DRF serializers for recipes API. Output matches schemas/recipe.json where applicable.
"""

from rest_framework import serializers
from .models import Recipe, RecipeVersion, Meal


def _version_to_schema_version(v):
    """Build schema-style version block from RecipeVersion."""
    if not v:
        return None
    return {
        'number': v.version_semver or str(v.version_number),
        'created_at': v.created_at.isoformat() if v.created_at else None,
        'parent_version': str(v.parent_version_id) if v.parent_version_id else None,
        'commit_message': v.commit_message or v.message or '',
        'author': v.author or '',
    }


def _get_title(v):
    """Title from metadata or denormalized title."""
    if not v:
        return ''
    return (v.metadata or {}).get('title') or v.title or ''


def _get_notes_display(v):
    """Notes as array of {type, content}; fallback from legacy notes text."""
    if not v:
        return []
    arr = getattr(v, 'notes_array', None) or []
    if arr:
        return arr
    if getattr(v, 'notes', None) and (v.notes or '').strip():
        return [{'type': 'tip', 'content': v.notes}]
    return []


class NotesArrayField(serializers.Field):
    """Read/write field: schema 'notes' array <-> model notes_array."""

    def to_representation(self, value):
        return _get_notes_display(self.parent.instance)

    def to_internal_value(self, data):
        if not isinstance(data, list):
            return []
        return data


class RecipeVersionSerializer(serializers.ModelSerializer):
    """Full version; outputs schema-aligned structure. Accepts metadata, notes (array) on write."""
    version = serializers.SerializerMethodField()
    metadata = serializers.JSONField(required=False, default=dict)
    notes = NotesArrayField(required=False)

    class Meta:
        model = RecipeVersion
        fields = [
            'id', 'recipe', 'owner', 'version_number', 'version', 'title', 'is_public', 'metadata',
            'ingredients', 'steps', 'equipment', 'notes', 'nutrition', 'tags',
            'created_at', 'commit_message', 'message', 'author', 'parent_version',
            'version_semver',
        ]
        read_only_fields = ['recipe', 'version_number', 'created_at', 'parent_version']

    def get_version(self, obj):
        return _version_to_schema_version(obj)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        meta = data.get('metadata') or {}
        if obj.title and not meta.get('title'):
            meta['title'] = obj.title
            data['metadata'] = meta
        return data

    def create(self, validated_data):
        notes_list = validated_data.pop('notes', None)
        if notes_list is not None:
            validated_data['notes_array'] = notes_list
        return super().create(validated_data)

    def update(self, instance, validated_data):
        notes_list = validated_data.pop('notes', None)
        if notes_list is not None:
            validated_data['notes_array'] = notes_list
        return super().update(instance, validated_data)


class RecipeVersionListSerializer(serializers.ModelSerializer):
    """Light version for listing."""
    version = serializers.SerializerMethodField()

    class Meta:
        model = RecipeVersion
        fields = ['id', 'version_number', 'version', 'title', 'owner', 'is_public', 'created_at', 'commit_message', 'message']

    def get_version(self, obj):
        return _version_to_schema_version(obj)


class RecipeCreateSerializer(serializers.ModelSerializer):
    """Minimal serializer for POST /recipes/; only name and slug to avoid rejecting extra body fields."""
    name = serializers.CharField(max_length=255, required=True)
    slug = serializers.SlugField(max_length=255, required=False, allow_blank=True)

    class Meta:
        model = Recipe
        fields = ['name', 'slug']


class RecipeSerializer(serializers.ModelSerializer):
    versions = RecipeVersionListSerializer(many=True, read_only=True)
    latest_version = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True, allow_null=True)

    class Meta:
        model = Recipe
        fields = ['id', 'uuid', 'owner', 'owner_username', 'name', 'slug', 'created_at', 'updated_at', 'versions', 'latest_version']
        read_only_fields = ['owner']

    def get_id(self, obj):
        return str(obj.uuid)

    def get_latest_version(self, obj):
        v = obj.versions.first()
        if not v:
            return None
        return RecipeVersionSerializer(v).data


class RecipeListSerializer(serializers.ModelSerializer):
    latest_version = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True, allow_null=True)

    class Meta:
        model = Recipe
        fields = ['id', 'uuid', 'owner', 'owner_username', 'name', 'slug', 'updated_at', 'latest_version']
        read_only_fields = ['owner']

    def get_id(self, obj):
        return str(obj.uuid)

    def get_latest_version(self, obj):
        v = obj.versions.first()
        if not v:
            return None
        return RecipeVersionListSerializer(v).data


class MealSerializer(serializers.ModelSerializer):
    recipe_version_detail = RecipeVersionSerializer(source='recipe_version', read_only=True)
    recipe_slug = serializers.SerializerMethodField()
    recipe_name = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = [
            'id', 'recipe_version', 'recipe_version_detail',
            'recipe_slug', 'recipe_name',
            'started_at', 'ended_at', 'current_step_index',
            'log_entries', 'session_notes', 'step_durations_seconds',
            'rating', 'modifications', 'photos',
        ]
        read_only_fields = ['started_at']

    def get_recipe_slug(self, obj):
        return obj.recipe_version.recipe.slug if obj.recipe_version_id else None

    def get_recipe_name(self, obj):
        return obj.recipe_version.recipe.name if obj.recipe_version_id else None


class MealCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = [
            'recipe_version', 'started_at', 'ended_at', 'current_step_index',
            'log_entries', 'session_notes', 'step_durations_seconds',
            'rating', 'modifications', 'photos',
        ]
