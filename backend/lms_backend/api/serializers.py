from rest_framework import serializers
from myapp.models import (
    User, Course, CourseModule, Content, Enrollment,
    ContentProgress, Payment, Assignment, AssignmentSubmission, Certificate
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'created_at']
        read_only_fields = ['created_at']

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class CourseModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = ['id', 'title', 'description', 'order']

class ContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Content
        fields = ['id', 'module', 'title', 'content_type', 'url', 'text', 'order', 'duration_minutes']

class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['id', 'course', 'module', 'title', 'description', 'due_date', 'total_points', 'passing_grade']

class CourseListSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    enrollment_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'price', 'teacher', 'created_at', 'enrollment_count']

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()

class CourseDetailSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    modules = CourseModuleSerializer(many=True, read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
    enrollment_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'price', 'teacher', 'created_at', 'modules', 'assignments', 'enrollment_count']

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()

class ContentProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentProgress
        fields = ['id', 'enrollment', 'content', 'completed', 'completed_date', 'time_spent_seconds']
        read_only_fields = ['completed_date']

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'enrollment', 'assignment', 'submission_date', 'content', 'file', 
                  'grade', 'status', 'feedback']
        read_only_fields = ['submission_date', 'grade', 'status', 'feedback']

class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'enrollment_date', 'status', 'progress']
        read_only_fields = ['enrollment_date', 'status']
    
    def get_progress(self, obj):
        return obj.calculate_progress()

class CertificateSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    
    class Meta:
        model = Certificate
        fields = ['id', 'student', 'course', 'issue_date', 'verification_code']
        read_only_fields = ['issue_date', 'verification_code']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'student', 'course', 'amount', 'payment_method', 'status', 'payment_date']
        read_only_fields = ['payment_date'] 