from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from myapp.models import (
    User, Course, CourseModule, Content, Enrollment,
    ContentProgress, Payment, Assignment, AssignmentSubmission, Certificate
)

from .serializers import (
    UserSerializer, CourseListSerializer, CourseDetailSerializer,
    CourseModuleSerializer, ContentSerializer, EnrollmentSerializer,
    ContentProgressSerializer, PaymentSerializer, AssignmentSerializer,
    AssignmentSubmissionSerializer, CertificateSerializer
)

from myapp.permissions import IsTeacherOrAdmin, IsStudent, IsTeacher

# Custom JWT Token View to allow login with either username or email
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '')
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        
        # Handle the case where neither username nor email is provided
        if not username and not email:
            return Response({"detail": "Username or email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Try to find the user by email if provided
        if email:
            try:
                user = User.objects.get(email=email)
                username = user.username
            except User.DoesNotExist:
                return Response({"detail": "No user found with this email"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Authenticate with username
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        else:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admin can see all users, others can only see themselves
        if self.request.user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)
        
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Return the authenticated user's profile
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        confirm_password = request.data.get('confirm_password')
        role = request.data.get('role', 'student')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        if not username or not email or not password:
            return Response({"detail": "Username, email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if confirm_password is not None and confirm_password != password:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ['student', 'teacher']:
            role = 'student'

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            # Admin can see all courses
            return Course.objects.all()
        elif user.role == 'teacher':
            # Teachers see only their courses
            return Course.objects.filter(teacher=user)
        else:
            # Students see courses they are enrolled in and public courses
            enrolled_courses = Course.objects.filter(enrollments__student=user)
            return enrolled_courses
    
    def perform_create(self, serializer):
        # Ensure the teacher field is set to the current user
        if self.request.user.role == 'teacher' or self.request.user.role == 'admin':
            serializer.save(teacher=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsStudent])
    def enroll(self, request, pk=None):
        course = self.get_object()
        user = request.user
        
        # Check if already enrolled
        if Enrollment.objects.filter(student=user, course=course).exists():
            return Response({"detail": "Already enrolled in this course"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Create enrollment
        enrollment = Enrollment.objects.create(student=user, course=course)
        return Response(EnrollmentSerializer(enrollment).data, 
                        status=status.HTTP_201_CREATED)

class CourseModuleViewSet(viewsets.ModelViewSet):
    serializer_class = CourseModuleSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get_queryset(self):
        course_id = self.kwargs.get('course_pk')
        return CourseModule.objects.filter(course_id=course_id).order_by('order')
    
    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_pk')
        course = get_object_or_404(Course, pk=course_id)
        
        # Only course teacher or admin can add modules
        if self.request.user.role == 'admin' or course.teacher == self.request.user:
            serializer.save(course_id=course_id)
        else:
            return Response({"detail": "You don't have permission to add modules to this course"}, 
                            status=status.HTTP_403_FORBIDDEN)

class ContentViewSet(viewsets.ModelViewSet):
    serializer_class = ContentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        module_id = self.kwargs.get('module_pk')
        return Content.objects.filter(module_id=module_id).order_by('order')
    
    def perform_create(self, serializer):
        module_id = self.kwargs.get('module_pk')
        module = get_object_or_404(CourseModule, pk=module_id)
        
        # Only course teacher or admin can add content
        if self.request.user.role == 'admin' or module.course.teacher == self.request.user:
            serializer.save(module_id=module_id)
        else:
            return Response({"detail": "You don't have permission to add content to this module"}, 
                            status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsStudent])
    def mark_complete(self, request, pk=None, module_pk=None, course_pk=None):
        content = self.get_object()
        user = request.user
        
        # Get enrollment
        try:
            enrollment = Enrollment.objects.get(student=user, course__modules__id=module_pk)
        except Enrollment.DoesNotExist:
            return Response({"detail": "You are not enrolled in this course"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Track progress
        content_progress, created = ContentProgress.objects.get_or_create(
            enrollment=enrollment,
            content=content,
            defaults={'completed': True, 'completed_date': timezone.now()}
        )
        
        if not created and not content_progress.completed:
            content_progress.completed = True
            content_progress.completed_date = timezone.now()
            content_progress.save()
        
        # Check if this affects course completion
        enrollment.check_completion_and_issue_certificate()
        
        return Response({"detail": "Content marked as completed"})

class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Enrollment.objects.all()
        elif user.role == 'teacher':
            return Enrollment.objects.filter(course__teacher=user)
        else:
            return Enrollment.objects.filter(student=user)

class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        course_id = self.kwargs.get('course_pk')
        user = self.request.user
        
        if user.role in ['teacher', 'admin']:
            if user.role == 'admin':
                return Assignment.objects.filter(course_id=course_id)
            else:
                return Assignment.objects.filter(course_id=course_id, course__teacher=user)
        else:
            # Students can only see assignments for courses they're enrolled in
            enrollments = Enrollment.objects.filter(student=user, course_id=course_id)
            if enrollments.exists():
                return Assignment.objects.filter(course_id=course_id)
            return Assignment.objects.none()
    
    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_pk')
        course = get_object_or_404(Course, pk=course_id)
        
        # Only course teacher or admin can add assignments
        if self.request.user.role == 'admin' or course.teacher == self.request.user:
            serializer.save(course_id=course_id)
        else:
            return Response({"detail": "You don't have permission to add assignments to this course"}, 
                            status=status.HTTP_403_FORBIDDEN)

class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        assignment_id = self.kwargs.get('assignment_pk')
        user = self.request.user
        
        if user.role == 'admin':
            return AssignmentSubmission.objects.filter(assignment_id=assignment_id)
        elif user.role == 'teacher':
            return AssignmentSubmission.objects.filter(
                assignment_id=assignment_id, 
                assignment__course__teacher=user
            )
        else:
            return AssignmentSubmission.objects.filter(
                assignment_id=assignment_id, 
                enrollment__student=user
            )
    
    def perform_create(self, serializer):
        assignment_id = self.kwargs.get('assignment_pk')
        assignment = get_object_or_404(Assignment, pk=assignment_id)
        user = self.request.user
        
        if user.role != 'student':
            return Response({"detail": "Only students can submit assignments"}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        try:
            enrollment = Enrollment.objects.get(student=user, course=assignment.course)
            serializer.save(assignment_id=assignment_id, enrollment=enrollment)
        except Enrollment.DoesNotExist:
            return Response({"detail": "You are not enrolled in this course"}, 
                            status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def grade(self, request, pk=None, assignment_pk=None, course_pk=None):
        submission = self.get_object()
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        
        if grade is None:
            return Response({"detail": "Grade is required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Only course teacher or admin can grade submissions
        if (self.request.user.role == 'admin' or 
                submission.assignment.course.teacher == self.request.user):
            submission.grade_submission(grade, feedback)
            return Response(AssignmentSubmissionSerializer(submission).data)
        else:
            return Response({"detail": "You don't have permission to grade this submission"}, 
                            status=status.HTTP_403_FORBIDDEN)

class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Certificate.objects.all()
        elif user.role == 'teacher':
            return Certificate.objects.filter(course__teacher=user)
        else:
            return Certificate.objects.filter(student=user)
    
    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        certificate = self.get_object()
        return Response({
            "valid": True,
            "student": certificate.student.username,
            "course": certificate.course.title,
            "issue_date": certificate.issue_date,
            "verification_code": certificate.verification_code
        })
