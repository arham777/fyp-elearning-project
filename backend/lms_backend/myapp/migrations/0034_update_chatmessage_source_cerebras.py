from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("myapp", "0033_chatmessage_error_code_chatmessage_error_message_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="chatmessage",
            name="source",
            field=models.CharField(
                choices=[("cerebras", "Cerebras"), ("gemini", "Gemini"), ("fallback", "Fallback")],
                default="cerebras",
                max_length=20,
            ),
        ),
    ]
