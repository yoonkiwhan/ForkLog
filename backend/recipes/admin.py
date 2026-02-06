from django.contrib import admin
from .models import Recipe, RecipeVersion, Meal, ParsedRecipeCache


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'owner', 'uuid', 'created_at', 'updated_at')
    list_filter = ('owner',)
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    readonly_fields = ('uuid',)
    raw_id_fields = ('owner',)


@admin.register(RecipeVersion)
class RecipeVersionAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'version_number', 'version_semver', 'title', 'owner', 'is_public', 'commit_message', 'created_at')
    list_filter = ('recipe', 'is_public')
    search_fields = ('title', 'recipe__name', 'commit_message')
    raw_id_fields = ('parent_version', 'owner')


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('recipe_version', 'started_at', 'ended_at', 'current_step_index', 'rating')
    list_filter = ('recipe_version__recipe',)


@admin.register(ParsedRecipeCache)
class ParsedRecipeCacheAdmin(admin.ModelAdmin):
    list_display = ('normalized_url', 'url', 'created_at')
    search_fields = ('url', 'normalized_url')
    readonly_fields = ('created_at',)
