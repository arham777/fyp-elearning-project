from django.db import migrations, models


ADD_COLUMNS_SQL = """
ALTER TABLE myapp_user ADD COLUMN IF NOT EXISTS preferred_category varchar(50) NULL;
ALTER TABLE myapp_user ADD COLUMN IF NOT EXISTS skill_level varchar(20) NULL;
ALTER TABLE myapp_user ADD COLUMN IF NOT EXISTS learning_goal varchar(20) NULL;

ALTER TABLE myapp_course ADD COLUMN IF NOT EXISTS category varchar(50) NULL;
ALTER TABLE myapp_course ADD COLUMN IF NOT EXISTS difficulty_level varchar(10) NOT NULL DEFAULT 'medium';
ALTER TABLE myapp_course ADD COLUMN IF NOT EXISTS difficulty_feedback_avg numeric(3,2) NULL;

ALTER TABLE myapp_courserating ADD COLUMN IF NOT EXISTS teacher_reply text NULL;
ALTER TABLE myapp_courserating ADD COLUMN IF NOT EXISTS difficulty_feedback smallint NULL;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0027_alter_payment_options_payment_card_brand_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(ADD_COLUMNS_SQL, reverse_sql=migrations.RunSQL.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='user',
                    name='preferred_category',
                    field=models.CharField(max_length=50, null=True, blank=True),
                ),
                migrations.AddField(
                    model_name='user',
                    name='skill_level',
                    field=models.CharField(max_length=20, null=True, blank=True, choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]),
                ),
                migrations.AddField(
                    model_name='user',
                    name='learning_goal',
                    field=models.CharField(max_length=20, null=True, blank=True, choices=[('job', 'Job'), ('skill_upgrade', 'Skill Upgrade'), ('certification', 'Certification')]),
                ),
                migrations.AddField(
                    model_name='course',
                    name='category',
                    field=models.CharField(max_length=50, null=True, blank=True),
                ),
                migrations.AddField(
                    model_name='course',
                    name='difficulty_level',
                    field=models.CharField(max_length=10, default='medium', choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]),
                ),
                migrations.AddField(
                    model_name='course',
                    name='difficulty_feedback_avg',
                    field=models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True),
                ),
                migrations.AddField(
                    model_name='courserating',
                    name='teacher_reply',
                    field=models.TextField(null=True, blank=True),
                ),
                migrations.AddField(
                    model_name='courserating',
                    name='difficulty_feedback',
                    field=models.PositiveSmallIntegerField(null=True, blank=True, choices=[(1, 'Easy'), (2, 'Medium'), (3, 'Hard')]),
                ),
            ],
        ),
    ]
