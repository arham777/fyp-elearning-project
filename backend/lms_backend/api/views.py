from rest_framework import viewsets, permissions, status, serializers
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Max, F
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from myapp.models import (
    User, Course, CourseModule, Content, Enrollment,
    ContentProgress, Payment, Assignment, AssignmentSubmission, Certificate,
    AssignmentQuestion, Notification
)

from .serializers import (
    UserSerializer, CourseListSerializer, CourseDetailSerializer,
    CourseModuleSerializer, ContentSerializer, EnrollmentSerializer,
    ContentProgressSerializer, PaymentSerializer, AssignmentSerializer,
    AssignmentSubmissionSerializer, CertificateSerializer, AssignmentQuestionSerializer
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
            # Students can browse all available courses
            # (Enrollment is handled via the enroll action)
            # Only published courses are visible to students
            return Course.objects.filter(is_published=True)
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'publish', 'unpublish', 'approve', 'reject']:
            permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        print(f"Course creation request received")
        print(f"Request data: {request.data}")
        print(f"User: {request.user}")
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"User role: {getattr(request.user, 'role', 'No role')}")
        
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            print(f"Serializer is valid: {serializer.validated_data}")
        except Exception as e:
            print(f"Serializer validation error: {e}")
            print(f"Serializer errors: {serializer.errors}")
            raise
            
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        # Debug logging
        print(f"User creating course: {self.request.user}")
        print(f"User role: {self.request.user.role}")
        print(f"User is authenticated: {self.request.user.is_authenticated}")
        print(f"Serializer data: {serializer.validated_data}")
        
        # Ensure the teacher field is set to the current user
        try:
            serializer.save(teacher=self.request.user)
            print("Course created successfully")
        except Exception as e:
            print(f"Error creating course: {e}")
            raise

    def perform_update(self, serializer):
        course = self.get_object()
        user = self.request.user
        if user.role != 'admin' and course.teacher_id != user.id:
            raise serializers.ValidationError({
                'detail': "You don't have permission to edit this course"
            })
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role != 'admin' and instance.teacher_id != user.id:
            raise serializers.ValidationError({
                'detail': "You don't have permission to delete this course"
            })
        instance.delete()
    
    @action(detail=True, methods=['get'], url_path='students',
            permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def students(self, request, pk=None):
        """Return distinct students enrolled in this course.

        Access control:
        - Admin: can view any course's students
        - Teacher: only the teacher of this course can view
        """
        course = self.get_object()
        user = request.user

        # Only the course's teacher (or admin) may access
        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to view students for this course"},
                            status=status.HTTP_403_FORBIDDEN)

        # Fetch distinct users enrolled in this course
        students_qs = User.objects.filter(enrollments__course=course, role='student').distinct()

        # Optional search by name/username/email
        search_term = request.query_params.get('search', '').strip()
        if search_term:
            students_qs = students_qs.filter(
                Q(first_name__icontains=search_term) |
                Q(last_name__icontains=search_term) |
                Q(username__icontains=search_term) |
                Q(email__icontains=search_term)
            )

        # Optional ordering
        ordering = request.query_params.get('ordering', '').strip()
        allowed_order_fields = {'first_name', 'last_name', 'username', 'email', 'created_at', '-first_name', '-last_name', '-username', '-email', '-created_at'}
        if ordering in allowed_order_fields:
            students_qs = students_qs.order_by(ordering)

        # Support pagination if configured
        page = self.paginate_queryset(students_qs)
        if page is not None:
            serializer = UserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = UserSerializer(students_qs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsStudent])
    def enroll(self, request, pk=None):
        course = self.get_object()
        user = request.user

        # Prevent enrollment into draft/unpublished courses
        if not course.is_published:
            return Response({"detail": "This course is not yet published."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Check if already enrolled
        if Enrollment.objects.filter(student=user, course=course).exists():
            return Response({"detail": "Already enrolled in this course"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Create enrollment
        enrollment = Enrollment.objects.create(student=user, course=course)
        return Response(EnrollmentSerializer(enrollment).data, 
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='publish',
            permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def publish(self, request, pk=None):
        """Teacher: submit for admin approval (pending). Admin: direct publish.

        Readiness checks:
        - Course must have at least 1 module
        - Course must have at least 1 content item or 1 assignment overall
        """
        course = self.get_object()
        user = request.user

        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to publish this course"},
                            status=status.HTTP_403_FORBIDDEN)

        modules_count = course.modules.count()
        contents_count = Content.objects.filter(module__course=course).count()
        assignments_count = course.assignments.count()

        if modules_count == 0:
            return Response({"detail": "Add at least one module before submitting for approval."},
                            status=status.HTTP_400_BAD_REQUEST)
        if contents_count == 0 and assignments_count == 0:
            return Response({"detail": "Add content or assignments before submitting for approval."},
                            status=status.HTTP_400_BAD_REQUEST)

        # If admin -> force publish
        if user.role == 'admin':
            course.is_published = True
            course.published_at = timezone.now()
            course.publication_status = 'published'
            course.approved_at = timezone.now()
            # Clear any previous note
            course.approval_note = None
            course.save(update_fields=["is_published", "published_at", "publication_status", "approved_at", "approval_note"])
            # Notify teacher
            Notification.objects.create(
                user=course.teacher,
                title="Course published",
                message=f"Your course '{course.title}' has been published by admin.",
                course=course,
                notif_type='course_approval'
            )
            return Response(CourseDetailSerializer(course).data)

        # Teacher -> set pending
        course.publication_status = 'pending'
        course.submitted_for_approval_at = timezone.now()
        # Ensure not published yet
        course.is_published = False
        course.save(update_fields=["publication_status", "submitted_for_approval_at", "is_published"])

        # Notify all admins of the approval request
        admin_users = User.objects.filter(role='admin', is_active=True)
        Notification.objects.bulk_create([
            Notification(
                user=admin,
                title="Course approval request",
                message=f"Course '{course.title}' was submitted by {course.teacher.username} and awaits approval.",
                course=course,
                notif_type='course_approval_request'
            ) for admin in admin_users
        ])

        return Response(CourseDetailSerializer(course).data)

    @action(detail=True, methods=['post'], url_path='unpublish',
            permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def unpublish(self, request, pk=None):
        """Unpublish a course (teacher owner or admin)."""
        course = self.get_object()
        user = request.user

        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to unpublish this course"},
                            status=status.HTTP_403_FORBIDDEN)

        if course.is_published:
            course.is_published = False
            course.publication_status = 'draft'
            course.save(update_fields=["is_published", "publication_status"])

        return Response(CourseDetailSerializer(course).data)

    @action(detail=True, methods=['post'], url_path='approve',
            permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def approve(self, request, pk=None):
        """Approve a pending course (admin only)."""
        # Only admin permitted
        if request.user.role != 'admin':
            return Response({"detail": "Only admin can approve courses."}, status=status.HTTP_403_FORBIDDEN)
        course = self.get_object()
        note = request.data.get('note') or ''
        # Only approve if in pending or rejected/draft and ready
        if course.modules.count() == 0:
            return Response({"detail": "Add at least one module before approval."}, status=status.HTTP_400_BAD_REQUEST)
        if Content.objects.filter(module__course=course).count() == 0 and course.assignments.count() == 0:
            return Response({"detail": "Add content or assignments before approval."}, status=status.HTTP_400_BAD_REQUEST)
        course.is_published = True
        course.published_at = timezone.now()
        course.publication_status = 'published'
        course.approval_note = note or None
        course.approved_at = timezone.now()
        course.save(update_fields=["is_published", "published_at", "publication_status", "approval_note", "approved_at"])
        # Notify teacher
        Notification.objects.create(
            user=course.teacher,
            title="Course approved",
            message=(note or f"Your course '{course.title}' has been approved and published."),
            course=course,
            notif_type='course_approval'
        )
        return Response(CourseDetailSerializer(course).data)

    @action(detail=True, methods=['post'], url_path='reject',
            permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def reject(self, request, pk=None):
        """Reject a course with a note (admin only)."""
        if request.user.role != 'admin':
            return Response({"detail": "Only admin can reject courses."}, status=status.HTTP_403_FORBIDDEN)
        course = self.get_object()
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({"detail": "Rejection note is required."}, status=status.HTTP_400_BAD_REQUEST)
        course.is_published = False
        course.publication_status = 'rejected'
        course.approval_note = note
        course.rejected_at = timezone.now()
        course.save(update_fields=["is_published", "publication_status", "approval_note", "rejected_at"])
        # Notify teacher
        Notification.objects.create(
            user=course.teacher,
            title="Course rejected",
            message=f"Your course '{course.title}' was rejected. Reason: {note}",
            course=course,
            notif_type='course_approval'
        )
        return Response(CourseDetailSerializer(course).data)

class CourseModuleViewSet(viewsets.ModelViewSet):
    serializer_class = CourseModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        course_id = self.kwargs.get('course_pk')
        qs = CourseModule.objects.filter(course_id=course_id).order_by('order')
        # Students should only see modules for published courses
        if getattr(self.request.user, 'role', None) == 'student':
            qs = qs.filter(course__is_published=True)
        return qs
    
    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_pk')
        course = get_object_or_404(Course, pk=course_id)
        
        # Only course teacher or admin can add modules
        if self.request.user.role == 'admin' or course.teacher == self.request.user:
            # Auto-ordering with step of 5 and optional insertion after a module
            step = 5
            after_module_id = self.request.data.get('after_module_id')

            new_order = None
            if after_module_id is not None:
                try:
                    prev = CourseModule.objects.get(id=int(after_module_id), course_id=course_id)
                    prev_order = prev.order
                    # Find the next module to see if there is a gap
                    next_mod = (
                        CourseModule.objects
                        .filter(course_id=course_id, order__gt=prev_order)
                        .order_by('order')
                        .first()
                    )
                    if next_mod is None:
                        # Append at the end relative to prev
                        new_order = prev_order + step
                    else:
                        # If no gap, shift subsequent modules to create room
                        if next_mod.order - prev_order <= 1:
                            CourseModule.objects.filter(course_id=course_id, order__gt=prev_order).update(order=F('order') + step)
                        # Place immediately after prev
                        new_order = prev_order + 1
                except (CourseModule.DoesNotExist, ValueError, TypeError):
                    new_order = None

            if new_order is None:
                # Append to end with configured step
                max_order = CourseModule.objects.filter(course_id=course_id).aggregate(m=Max('order'))['m'] or 0
                new_order = max_order + step if max_order else step

            # Final safety to avoid collisions in unexpected scenarios
            if CourseModule.objects.filter(course_id=course_id, order=new_order).exists():
                max_order = CourseModule.objects.filter(course_id=course_id).aggregate(m=Max('order'))['m'] or 0
                new_order = max_order + step if max_order else step

            serializer.save(course_id=course_id, order=new_order)
        else:
            return Response({"detail": "You don't have permission to add modules to this course"}, 
                            status=status.HTTP_403_FORBIDDEN)

    def perform_update(self, serializer):
        course_id = self.kwargs.get('course_pk')
        instance = self.get_object()
        # Only course teacher or admin can update
        course = get_object_or_404(Course, pk=course_id)
        if not (self.request.user.role == 'admin' or course.teacher == self.request.user):
            raise serializers.ValidationError({
                'detail': "You don't have permission to edit modules for this course"
            })
        desired_order = serializer.validated_data.get('order', instance.order)
        if CourseModule.objects.filter(course_id=course_id, order=desired_order).exclude(id=instance.id).exists():
            raise serializers.ValidationError({
                'order': 'Order must be unique within this course.'
            })
        serializer.save()

    def perform_destroy(self, instance):
        course = instance.course
        if not (self.request.user.role == 'admin' or course.teacher == self.request.user):
            raise serializers.ValidationError({
                'detail': "You don't have permission to delete modules for this course"
            })
        instance.delete()

class ContentViewSet(viewsets.ModelViewSet):
    serializer_class = ContentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        module_id = self.kwargs.get('module_pk')
        qs = Content.objects.filter(module_id=module_id).order_by('order')
        # Students should only see content for modules whose course is published
        if getattr(self.request.user, 'role', None) == 'student':
            qs = qs.filter(module__course__is_published=True)
        return qs
    
    def perform_create(self, serializer):
        module_id = self.kwargs.get('module_pk')
        module = get_object_or_404(CourseModule, pk=module_id)
        
        # Only course teacher or admin can add content
        if self.request.user.role == 'admin' or module.course.teacher == self.request.user:
            # Minimal validation per content type
            content_type = self.request.data.get('content_type')
            if content_type == 'video':
                file_provided = 'video' in self.request.FILES and self.request.FILES.get('video') is not None
                url_provided = bool(self.request.data.get('url'))
                if not (file_provided or url_provided):
                    raise serializers.ValidationError({
                        'video': 'Provide a video file or a video URL for video content.'
                    })
            elif content_type == 'reading':
                if not self.request.data.get('text'):
                    raise serializers.ValidationError({
                        'text': 'Text is required for reading content.'
                    })
            # Step-based ordering with optional insertion after a specific content
            step = 5
            after_content_id = self.request.data.get('after_content_id')

            new_order = None
            if after_content_id is not None:
                try:
                    prev = Content.objects.get(id=int(after_content_id), module_id=module_id)
                    prev_order = prev.order
                    next_item = (
                        Content.objects
                        .filter(module_id=module_id, order__gt=prev_order)
                        .order_by('order')
                        .first()
                    )
                    if next_item is None:
                        new_order = prev_order + step
                    else:
                        if next_item.order - prev_order <= 1:
                            Content.objects.filter(module_id=module_id, order__gt=prev_order).update(order=F('order') + step)
                        new_order = prev_order + 1
                except (Content.DoesNotExist, ValueError, TypeError):
                    new_order = None

            if new_order is None:
                max_order = Content.objects.filter(module_id=module_id).aggregate(m=Max('order'))['m'] or 0
                new_order = max_order + step if max_order else step

            # Safety against accidental collisions
            if Content.objects.filter(module_id=module_id, order=new_order).exists():
                max_order = Content.objects.filter(module_id=module_id).aggregate(m=Max('order'))['m'] or 0
                new_order = max_order + step if max_order else step

            serializer.save(module_id=module_id, order=new_order)
        else:
            return Response({"detail": "You don't have permission to add content to this module"}, 
                            status=status.HTTP_403_FORBIDDEN)
    
    def perform_update(self, serializer):
        module_id = self.kwargs.get('module_pk')
        instance = self.get_object()
        module = get_object_or_404(CourseModule, pk=module_id)
        if not (self.request.user.role == 'admin' or module.course.teacher == self.request.user):
            raise serializers.ValidationError({
                'detail': "You don't have permission to edit content for this module"
            })
        desired_order = serializer.validated_data.get('order', instance.order)
        if Content.objects.filter(module_id=module_id, order=desired_order).exclude(id=instance.id).exists():
            raise serializers.ValidationError({
                'order': 'Order must be unique within this module.'
            })
        serializer.save()

    def perform_destroy(self, instance):
        module = instance.module
        if not (self.request.user.role == 'admin' or module.course.teacher == self.request.user):
            raise serializers.ValidationError({
                'detail': "You don't have permission to delete content for this module"
            })
        instance.delete()
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def progress(self, request, course_pk=None, module_pk=None):
        """Return completed content IDs for the authenticated student in this module.

        Teachers/admins get an empty list because progress is tracked per student enrollment.
        """
        user = request.user
        # Only students have per-user progress
        if user.role != 'student':
            return Response([])

        try:
            enrollment = Enrollment.objects.get(student=user, course__modules__id=module_pk)
        except Enrollment.DoesNotExist:
            # Not enrolled yet -> no progress
            return Response([])

        content_ids = Content.objects.filter(module_id=module_pk).values_list('id', flat=True)
        progresses = ContentProgress.objects.filter(enrollment=enrollment, content_id__in=content_ids, completed=True)
        completed_ids = list(progresses.values_list('content_id', flat=True))
        return Response(completed_ids)

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
        module_id = self.request.query_params.get('module')
        base_qs = Assignment.objects.filter(course_id=course_id)
        if module_id:
            base_qs = base_qs.filter(module_id=module_id)

        if user.role == 'admin':
            return base_qs
        if user.role == 'teacher':
            return base_qs.filter(course__teacher=user)
        # Students can only see assignments for courses they're enrolled in
        enrollments = Enrollment.objects.filter(student=user, course_id=course_id)
        if enrollments.exists():
            return base_qs
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
            # Attempt gating
            existing = AssignmentSubmission.objects.filter(enrollment=enrollment, assignment=assignment)
            attempts_used = existing.count()

            # If already passed in any graded attempt, block further attempts
            best = existing.filter(status='graded').order_by('-grade').first()
            if best and best.grade is not None and best.grade >= assignment.passing_grade:
                return Response({"detail": "You already passed this assignment."}, status=status.HTTP_400_BAD_REQUEST)

            # Enforce attempt limit
            if attempts_used >= assignment.max_attempts:
                return Response({"detail": "No attempts left."}, status=status.HTTP_400_BAD_REQUEST)

            # For Q&A, block a new attempt if a previous attempt is still ungraded
            if assignment.assignment_type == 'qa' and existing.filter(status='submitted').exists():
                return Response({"detail": "Previous attempt is awaiting grading."}, status=status.HTTP_400_BAD_REQUEST)

            submission = serializer.save(
                assignment_id=assignment_id,
                enrollment=enrollment,
                attempt_number=attempts_used + 1
            )
            # Auto-grade submissions if applicable
            if assignment.assignment_type == 'mcq':
                answers = submission.answers or []
                # Map question_id -> (points, set(correct_option_ids))
                mcq_questions = AssignmentQuestion.objects.filter(assignment=assignment, question_type='mcq').prefetch_related('options')
                correct_map = {
                    q.id: (q.points, {opt.id for opt in q.options.all() if opt.is_correct})
                    for q in mcq_questions
                }
                total_points_available = sum(points for (points, _) in correct_map.values()) or 1
                earned_points = 0
                for ans in answers:
                    qid = ans.get('question_id')
                    selected = set(ans.get('selected_option_ids') or [])
                    if qid in correct_map:
                        points, correct_set = correct_map[qid]
                        if selected == correct_set:
                            earned_points += points
                percent = round((earned_points / total_points_available) * 100, 2)
                submission.grade = percent
                submission.status = 'graded'
                submission.save(update_fields=['grade', 'status'])
            elif assignment.assignment_type == 'qa':
                # Advanced keyword/acceptable-answer QA auto-grading
                answers = submission.answers or []
                qa_questions = AssignmentQuestion.objects.filter(assignment=assignment, question_type='qa')
                total_points_available = sum(q.points for q in qa_questions) or 1
                earned_points = 0

                # question_id -> config
                def norm_list(items):
                    arr = [s.strip().lower() for s in (items or []) if isinstance(s, str) and s.strip()]
                    # remove duplicates preserving order
                    seen = set(); out = []
                    for s in arr:
                        if s not in seen:
                            seen.add(s); out.append(s)
                    return out

                qcfg = {}
                for q in qa_questions:
                    qcfg[q.id] = {
                        'points': q.points,
                        'keywords': norm_list(q.keywords),
                        'required': norm_list(q.required_keywords),
                        'negative': norm_list(q.negative_keywords),
                        'acceptable': norm_list(q.acceptable_answers),
                    }

                for ans in answers:
                    qid = ans.get('question_id')
                    text_raw = ans.get('text_answer') or ''
                    text = text_raw.lower()
                    if qid not in qcfg:
                        continue
                    cfg = qcfg[qid]
                    pts = cfg['points']
                    if pts <= 0:
                        continue

                    # Full credit if acceptable answer matches exactly (case-insensitive trim)
                    norm_text = text.strip()
                    if cfg['acceptable'] and norm_text in cfg['acceptable']:
                        earned_points += pts
                        continue

                    # Required keywords: if provided, all must be present
                    if cfg['required']:
                        if not all(r in text for r in cfg['required']):
                            # If any required missing → zero for this question
                            continue

                    # Optional keywords proportional credit
                    opt = cfg['keywords']
                    opt_credit = 0
                    if opt:
                        matched_opt = sum(1 for kw in opt if kw in text)
                        opt_credit = pts * (matched_opt / len(opt))
                    else:
                        # If no optional keywords configured, base credit is full after required pass
                        opt_credit = pts

                    # Negative keywords penalty
                    neg = cfg['negative']
                    penalty = 0
                    if neg:
                        penalty = (pts * 0.2) * sum(1 for kw in neg if kw in text)  # 20% per negative keyword

                    earned_points += max(0, min(pts, opt_credit - penalty))

                percent = round((earned_points / total_points_available) * 100, 2)
                submission.grade = percent
                submission.status = 'graded'
                submission.save(update_fields=['grade', 'status'])
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

class AssignmentQuestionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        assignment_id = self.kwargs.get('assignment_pk')
        user = self.request.user
        base_qs = AssignmentQuestion.objects.filter(assignment_id=assignment_id)
        if user.role == 'admin':
            return base_qs
        if user.role == 'teacher':
            return base_qs.filter(assignment__course__teacher=user)
        return base_qs

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

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.Serializer  # will override methods
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'course': n.course_id,
            'notif_type': n.notif_type,
            'is_read': n.is_read,
            'created_at': n.created_at,
        } for n in qs]
        return Response(data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        cnt = self.get_queryset().filter(is_read=False).count()
        return Response({'unread': cnt})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        n = self.get_queryset().filter(pk=pk).first()
        if not n:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'success': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        qs = self.get_queryset().filter(is_read=False)
        count = qs.count()
        if count:
            qs.update(is_read=True)
        return Response({'success': True, 'marked': count})

    @action(detail=False, methods=['post'], url_path='broadcast')
    def broadcast(self, request):
        """Broadcast an announcement to all teachers or all students (admin only).

        Expected payload:
        {
          "audience": "teacher" | "student" | "teachers" | "students",
          "title": string,
          "message": string,
          "notif_type": "info" | "warning" | "success"
        }
        """
        user = request.user
        if getattr(user, 'role', None) != 'admin':
            return Response({"detail": "Only admin can broadcast notifications."}, status=status.HTTP_403_FORBIDDEN)

        audience_raw = (request.data.get('audience') or '').strip().lower()
        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        notif_type = (request.data.get('notif_type') or 'info').strip()

        if audience_raw not in {'teacher', 'teachers', 'student', 'students'}:
            return Response({"detail": "audience must be 'teacher' or 'student'."}, status=status.HTTP_400_BAD_REQUEST)
        if not title or not message:
            return Response({"detail": "Both title and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        role = 'teacher' if audience_raw in {'teacher', 'teachers'} else 'student'
        recipients = User.objects.filter(role=role, is_active=True)
        count = recipients.count()

        if count == 0:
            return Response({'success': True, 'created': 0})

        Notification.objects.bulk_create([
            Notification(
                user=u,
                title=title,
                message=message,
                notif_type=notif_type
            ) for u in recipients
        ])

        return Response({'success': True, 'created': count})
