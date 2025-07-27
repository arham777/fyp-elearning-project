from rest_framework import permissions

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