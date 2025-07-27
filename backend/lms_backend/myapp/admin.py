from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Course, Enrollment, Payment, Assignment, Certificate, 
    CourseModule, Content, ContentProgress, AssignmentSubmission
)

class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'created_at', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('created_at',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_staff', 'is_superuser'),
        }),
    )
    search_fields = ('username', 'email')
    ordering = ('username',)
    filter_horizontal = ('groups', 'user_permissions')

class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    search_fields = ('title', 'course__title')

class ContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'content_type', 'order')
    list_filter = ('content_type', 'module__course')
    search_fields = ('title', 'module__title')

class ContentProgressAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'content', 'completed', 'completed_date')
    list_filter = ('completed', 'enrollment__course')
    search_fields = ('enrollment__student__username', 'content__title')

class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'assignment', 'submission_date', 'status', 'grade')
    list_filter = ('status', 'assignment__course')
    search_fields = ('enrollment__student__username', 'assignment__title')

admin.site.register(User, UserAdmin)
admin.site.register(Course)
admin.site.register(CourseModule, CourseModuleAdmin)
admin.site.register(Content, ContentAdmin)
admin.site.register(Enrollment)
admin.site.register(ContentProgress, ContentProgressAdmin)
admin.site.register(Payment)
admin.site.register(Assignment)
admin.site.register(AssignmentSubmission, AssignmentSubmissionAdmin)
admin.site.register(Certificate)