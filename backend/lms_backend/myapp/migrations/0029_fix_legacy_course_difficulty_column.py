from django.db import migrations


SQL = """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'myapp_course'
          AND column_name = 'difficulty'
    ) THEN
        -- Ensure existing rows have a value so we can safely drop NOT NULL constraints.
        UPDATE myapp_course SET difficulty = 'medium' WHERE difficulty IS NULL;

        -- Make inserts succeed even if legacy column still exists.
        ALTER TABLE myapp_course ALTER COLUMN difficulty SET DEFAULT 'medium';
        ALTER TABLE myapp_course ALTER COLUMN difficulty DROP NOT NULL;
    END IF;
END $$;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0028_learning_preferences_and_course_difficulty_feedback'),
    ]

    operations = [
        migrations.RunSQL(SQL, reverse_sql=migrations.RunSQL.noop),
    ]
