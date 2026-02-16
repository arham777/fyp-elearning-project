from django.db import models
from django.conf import settings
import uuid


class ChatSession(models.Model):
    """Logical conversation bucket used for multi-turn memory."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions'
    )
    role = models.CharField(max_length=20)
    title = models.CharField(max_length=200, blank=True, default='')
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
        ]

    def __str__(self):
        label = self.title or "Untitled session"
        return f"{self.user.username} - {label[:60]}"


class ChatMessage(models.Model):
    """Store message pairs, tool usage, and runtime metadata."""

    STATUS_CHOICES = (
        ('completed', 'Completed'),
        ('error', 'Error'),
        ('partial', 'Partial'),
    )
    SOURCE_CHOICES = (
        ('cerebras', 'Cerebras'),
        ('gemini', 'Gemini'),
        ('fallback', 'Fallback'),
    )

    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True,
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=20)  # student, teacher, admin
    query = models.TextField()
    response = models.TextField(blank=True, default='')
    function_calls = models.JSONField(default=list)
    reasoning_trace = models.JSONField(default=list)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='cerebras')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    model_name = models.CharField(max_length=100, null=True, blank=True)
    token_count_input = models.IntegerField(null=True, blank=True)
    token_count_output = models.IntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    feedback = models.CharField(max_length=20, null=True, blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['session', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.query[:50]}"
