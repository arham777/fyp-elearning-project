from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsStudent, IsTeacher, IsAdmin, IsTeacherOrAdmin
from .models import User, Course, Enrollment, Payment, Assignment, Certificate
from .serializers import (
    UserSerializer, CourseSerializer, EnrollmentSerializer,
    PaymentSerializer, AssignmentSerializer, CertificateSerializer
)
from rest_framework import serializers

# User Views
class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]  # Only admins can list all users

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]  # Any authenticated user can view their own details

# Course Views
class CourseListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return Course.objects.filter(teacher=self.request.user)
        elif self.request.user.role == 'admin':
            return Course.objects.all()
        return Course.objects.all()  # Students can see all courses

    def perform_create(self, serializer):
        if self.request.user.role != 'teacher':
            raise serializers.ValidationError("Only teachers can create courses.")
        serializer.save(teacher=self.request.user)

class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherOrAdmin]  # Teachers and admins can edit/delete

    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return Course.objects.filter(teacher=self.request.user)
        elif self.request.user.role == 'admin':
            return Course.objects.all()
        return Course.objects.all()  # Students can view

# Enrollment Views
class EnrollmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsStudent | IsAdmin]  # Students can enroll, admins can view all

    def get_queryset(self):
        if self.request.user.role == 'student':
            return Enrollment.objects.filter(student=self.request.user)
        elif self.request.user.role == 'admin':
            return Enrollment.objects.all()
        return Enrollment.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            raise serializers.ValidationError("Only students can enroll.")
        serializer.save(student=self.request.user)

# Payment Views
class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsStudent | IsAdmin]  # Students can pay, admins can view all

    def get_queryset(self):
        if self.request.user.role == 'student':
            return Payment.objects.filter(student=self.request.user)
        elif self.request.user.role == 'admin':
            return Payment.objects.all()
        return Payment.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            raise serializers.ValidationError("Only students can make payments.")
        serializer.save(student=self.request.user)

# Assignment Views
class AssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsTeacher | IsStudent | IsAdmin]  # Teachers create, students view, admins manage

    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return Assignment.objects.filter(course__teacher=self.request.user)
        elif self.request.user.role == 'student':
            return Assignment.objects.filter(course__enrollments__student=self.request.user)
        elif self.request.user.role == 'admin':
            return Assignment.objects.all()
        return Assignment.objects.none()

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        if self.request.user.role != 'teacher' or course.teacher != self.request.user:
            raise serializers.ValidationError("Only the course teacher can create assignments.")
        serializer.save()

# Certificate Views
class CertificateListCreateView(generics.ListCreateAPIView):
    serializer_class = CertificateSerializer
    permission_classes = [IsStudent | IsAdmin]  # Students view their own, admins create/view all

    def get_queryset(self):
        if self.request.user.role == 'student':
            return Certificate.objects.filter(student=self.request.user)
        elif self.request.user.role == 'admin':
            return Certificate.objects.all()
        return Certificate.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            raise serializers.ValidationError("Only admins can issue certificates.")
        serializer.save()

# User Registration View
class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Anyone can register

    def perform_create(self, serializer):
        serializer.save()