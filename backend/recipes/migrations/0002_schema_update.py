# Generated manually for schemas/recipe.json alignment

import uuid
import django.db.models.deletion
from django.db import migrations, models


def backfill_recipe_uuids(apps, schema_editor):
    Recipe = apps.get_model('recipes', 'Recipe')
    for recipe in Recipe.objects.all():
        recipe.uuid = uuid.uuid4()
        recipe.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0001_initial'),
    ]

    operations = [
        # Step 1: add uuid as nullable for backfill
        migrations.AddField(
            model_name='recipe',
            name='uuid',
            field=models.UUIDField(db_index=True, editable=False, null=True, unique=False),
        ),
        # Step 2: add new RecipeVersion fields
        migrations.AddField(
            model_name='recipeversion',
            name='version_semver',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='commit_message',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='author',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='equipment',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='notes_array',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='nutrition',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='recipeversion',
            name='parent_version',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='children', to='recipes.recipeversion'),
        ),
        # Step 3: add CookingSession fields
        migrations.AddField(
            model_name='cookingsession',
            name='rating',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='cookingsession',
            name='modifications',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='cookingsession',
            name='photos',
            field=models.JSONField(blank=True, default=list),
        ),
        # Step 4: backfill Recipe.uuid then make it unique non-null
        migrations.RunPython(backfill_recipe_uuids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='recipe',
            name='uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
