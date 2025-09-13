from rest_framework import permissions
from django.utils import timezone

from .models import User

class IsTeacher(permissions.BasePermission):
    """
    Custom permission to only allow teachers to perform actions.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'teacher'

class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow teachers or admins to perform actions.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role in ['teacher', 'admin']

class IsStudent(permissions.BasePermission):
    """
    Custom permission to only allow students to perform actions.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'student'

class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to perform actions.
    """
    def has_object_permission(self, request, view, obj):
        # Check if the object has a student attribute
        if hasattr(obj, 'student'):
            return obj.student == request.user
        # Check if the object has a teacher attribute
        elif hasattr(obj, 'teacher'):
            return obj.teacher == request.user
        return False

class IsCourseTeacher(permissions.BasePermission):
    """
    Custom permission to only allow the teacher of a course to perform actions.
    """
    def has_object_permission(self, request, view, obj):
        # Check if obj is a Course
        if hasattr(obj, 'teacher'):
            return obj.teacher == request.user
        # Check if obj is related to a course
        elif hasattr(obj, 'course'):
            return obj.course.teacher == request.user
        # Check if obj has a module which is related to a course
        elif hasattr(obj, 'module') and hasattr(obj.module, 'course'):
            return obj.module.course.teacher == request.user
        return False

class IsActiveUser(permissions.BasePermission):
    """
    Deny access to users that are currently blocked. Also auto-unblocks users
    whose `deactivated_until` time has passed.

    Apply this together with IsAuthenticated.
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        # Auto-refresh expiry
        try:
            if hasattr(user, 'refresh_block_status'):
                user.refresh_block_status()
        except Exception:
            pass
        # Deny if still blocked
        try:
            blocked = getattr(user, 'is_blocked', False)
            if blocked:
                # Provide a structured human-readable message. Prefix allows the frontend to detect this specific case.
                until = getattr(user, 'deactivated_until', None)
                reason = getattr(user, 'deactivation_reason', None) or 'Your account has been deactivated by admin.'
                if until and until > timezone.now():
                    until_str = until.strftime('%Y-%m-%d %H:%M UTC')
                    self.message = f"ACCOUNT_BLOCKED: {reason} You will be automatically unblocked on {until_str}."
                else:
                    self.message = f"ACCOUNT_BLOCKED: {reason}"
                return False
            return True
        except Exception:
            # If we cannot determine, allow rather than lock everyone out
            return True