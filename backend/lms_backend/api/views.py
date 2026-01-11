from rest_framework import viewsets, permissions, status, serializers
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings as dj_settings
from django.contrib.auth.password_validation import validate_password
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Max, F, Count, Avg
from django.db.models.functions import TruncMonth, TruncDate
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from datetime import datetime, timedelta, timezone as dt_timezone
from django.core.mail import send_mail
import hmac
import hashlib
import logging
from decimal import Decimal, ROUND_HALF_UP
try:
    import stripe
except ModuleNotFoundError:
    stripe = None

from myapp.models import (
    User, Course, CourseModule, Content, Enrollment,
    ContentProgress, Payment, Assignment, AssignmentSubmission, Certificate,
    AssignmentQuestion, Notification, CourseRating, SupportRequest,
    Badge, UserBadge, UserStats, DailyActivity, XPTransaction
)

from .serializers import (
    UserSerializer, CourseListSerializer, CourseDetailSerializer,
    CourseModuleSerializer, ContentSerializer, EnrollmentSerializer,
    ContentProgressSerializer, PaymentSerializer, AssignmentSerializer,
    AssignmentSubmissionSerializer, CertificateSerializer, AssignmentQuestionSerializer,
    CourseRatingSerializer, SupportRequestSerializer,
    BadgeSerializer, UserBadgeSerializer, UserStatsSerializer, XPTransactionSerializer, LeaderboardEntrySerializer
)

from myapp.permissions import IsTeacherOrAdmin, IsStudent, IsTeacher, IsActiveUser

logger = logging.getLogger(__name__)

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
        
        # Pre-check blocked status if user exists (so we can return a clear message)
        try:
            user_lookup = User.objects.filter(username=username).first()
            if user_lookup:
                # Auto-refresh expiry if duration elapsed
                try:
                    user_lookup.refresh_block_status()
                except Exception:
                    pass
                if getattr(user_lookup, 'is_blocked', False):
                    # Construct message similar to IsActiveUser
                    until = getattr(user_lookup, 'deactivated_until', None)
                    reason = getattr(user_lookup, 'deactivation_reason', None) or 'Your account has been deactivated by admin.'
                    if until and until > timezone.now():
                        until_str = until.strftime('%Y-%m-%d %H:%M UTC')
                        return Response({"detail": f"ACCOUNT_BLOCKED: {reason} You will be automatically unblocked on {until_str}."}, status=status.HTTP_403_FORBIDDEN)
                    return Response({"detail": f"ACCOUNT_BLOCKED: {reason}"}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass

        # Authenticate with username
        user = authenticate(username=username, password=password)

        if user is not None:
            # Final guard if blocked (e.g., backend auth permitted)
            try:
                if getattr(user, 'is_blocked', False):
                    until = getattr(user, 'deactivated_until', None)
                    reason = getattr(user, 'deactivation_reason', None) or 'Your account has been deactivated by admin.'
                    if until and until > timezone.now():
                        until_str = until.strftime('%Y-%m-%d %H:%M UTC')
                        return Response({"detail": f"ACCOUNT_BLOCKED: {reason} You will be automatically unblocked on {until_str}."}, status=status.HTTP_403_FORBIDDEN)
                    return Response({"detail": f"ACCOUNT_BLOCKED: {reason}"}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                pass
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
    def get_queryset(self):
        # Admin can see all users (with optional filtering), others can only see themselves
        if self.request.user.role == 'admin':
            qs = User.objects.all()
            role = (self.request.query_params.get('role') or '').strip().lower()
            if role in ('student', 'teacher', 'admin'):
                qs = qs.filter(role=role)
            search_term = (self.request.query_params.get('search') or '').strip()
            if search_term:
                qs = qs.filter(
                    Q(first_name__icontains=search_term) |
                    Q(last_name__icontains=search_term) |
                    Q(username__icontains=search_term) |
                    Q(email__icontains=search_term)
                )
            ordering = (self.request.query_params.get('ordering') or '').strip()
            allowed = {
                'first_name','last_name','username','email','date_joined','created_at',
                '-first_name','-last_name','-username','-email','-date_joined','-created_at'
            }
            if ordering in allowed:
                qs = qs.order_by(ordering)
            return qs
        return User.objects.filter(id=self.request.user.id)
        
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Return the authenticated user's profile
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='learning-preferences', permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def learning_preferences(self, request):
        user = request.user
        if user.role != 'student':
            return Response({"detail": "Only students can update learning preferences."}, status=status.HTTP_403_FORBIDDEN)

        preferred_category = request.data.get('preferred_category')
        skill_level = request.data.get('skill_level')
        learning_goal = request.data.get('learning_goal')

        allowed_skill = {'beginner', 'intermediate', 'advanced'}
        allowed_goal = {'job', 'skill_upgrade', 'certification'}

        if skill_level is not None:
            skill_level = str(skill_level).strip().lower() or None
            if skill_level and skill_level not in allowed_skill:
                return Response({"detail": "Invalid skill_level."}, status=status.HTTP_400_BAD_REQUEST)
            user.skill_level = skill_level

        if preferred_category is not None:
            preferred_category = str(preferred_category).strip() or None
            user.preferred_category = preferred_category

        if learning_goal is not None:
            learning_goal = str(learning_goal).strip().lower() or None
            if learning_goal and learning_goal not in allowed_goal:
                return Response({"detail": "Invalid learning_goal."}, status=status.HTTP_400_BAD_REQUEST)
            user.learning_goal = learning_goal

        user.save(update_fields=['preferred_category', 'skill_level', 'learning_goal'])
        return Response(UserSerializer(user).data)

    @action(
        detail=False,
        methods=['get'],
        url_path='progress-heatmap',
        permission_classes=[permissions.IsAuthenticated, IsActiveUser, IsStudent],
    )
    def progress_heatmap(self, request):
        user = request.user
        days_raw = request.query_params.get('days', '84')
        try:
            days = int(days_raw)
        except Exception:
            days = 84
        days = max(7, min(days, 365))

        course_id_raw = request.query_params.get('course_id')
        course_id = None
        if course_id_raw not in (None, '', 'null'):
            try:
                course_id = int(course_id_raw)
            except Exception:
                course_id = None

        start_dt = timezone.now() - timedelta(days=days - 1)

        qs = ContentProgress.objects.filter(
            enrollment__student=user,
            completed=True,
            completed_date__isnull=False,
            completed_date__gte=start_dt,
        )
        if course_id:
            qs = qs.filter(enrollment__course_id=course_id)

        rows = (
            qs.annotate(day=TruncDate('completed_date'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )

        data = [
            {
                'date': r['day'].isoformat() if r.get('day') else None,
                'count': int(r.get('count') or 0),
            }
            for r in rows
            if r.get('day') is not None
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='block', permission_classes=[permissions.IsAuthenticated, IsActiveUser, IsTeacherOrAdmin])
    def block_user(self, request, pk=None):
        """Admin-only: block a user with optional reason and duration.

        Body accepts either:
        - reason: string
        - duration_days: int (optional)
        - until: ISO datetime string (optional; overrides duration_days)
        """
        if request.user.role != 'admin':
            return Response({"detail": "Only admin can block users."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()

        reason = (request.data.get('reason') or '').strip() or None
        duration_days = request.data.get('duration_days')
        until_raw = request.data.get('until')
        until = None
        if until_raw:
            try:
                # Expect ISO format; support 'Z' suffix
                parsed = datetime.fromisoformat(str(until_raw).replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    until = timezone.make_aware(parsed)
                else:
                    # Normalize to UTC for consistency
                    until = parsed.astimezone(dt_timezone.utc)
            except Exception:
                until = None
        elif duration_days is not None:
            try:
                days = int(duration_days)
                if days > 0:
                    until = timezone.now() + timedelta(days=days)
            except Exception:
                until = None

        user.is_active = False
        user.deactivated_at = timezone.now()
        user.deactivation_reason = reason
        user.deactivated_until = until
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivation_reason', 'deactivated_until'])

        # Blacklist all outstanding refresh tokens for this user
        try:
            for outstanding in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='unblock', permission_classes=[permissions.IsAuthenticated, IsActiveUser, IsTeacherOrAdmin])
    def unblock_user(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({"detail": "Only admin can unblock users."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = True
        user.deactivated_at = None
        user.deactivation_reason = None
        user.deactivated_until = None
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivation_reason', 'deactivated_until'])
        return Response(UserSerializer(user).data)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            username = request.data.get('username', '').strip()
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            confirm_password = request.data.get('confirm_password')
            role = request.data.get('role', 'student')
            first_name = request.data.get('first_name', '').strip()
            last_name = request.data.get('last_name', '').strip()
            preferred_category = request.data.get('preferred_category')
            skill_level = request.data.get('skill_level')
            learning_goal = request.data.get('learning_goal')

            if not username or not email or not password:
                return Response({"detail": "Username, email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

            if confirm_password is not None and confirm_password != password:
                return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

            if role not in ['student', 'teacher']:
                role = 'student'

            # Optional learning preferences (students only)
            extra_fields = {}
            if role == 'student':
                allowed_skill = {'beginner', 'intermediate', 'advanced'}
                allowed_goal = {'job', 'skill_upgrade', 'certification'}

                if preferred_category is not None:
                    v = str(preferred_category).strip() or None
                    extra_fields['preferred_category'] = v
                if skill_level is not None:
                    v = str(skill_level).strip().lower() or None
                    if v and v not in allowed_skill:
                        return Response({"detail": "Invalid skill_level."}, status=status.HTTP_400_BAD_REQUEST)
                    extra_fields['skill_level'] = v
                if learning_goal is not None:
                    v = str(learning_goal).strip().lower() or None
                    if v and v not in allowed_goal:
                        return Response({"detail": "Invalid learning_goal."}, status=status.HTTP_400_BAD_REQUEST)
                    extra_fields['learning_goal'] = v

            # Validate password using Django's validators for clearer feedback
            try:
                validate_password(password)
            except Exception as pw_err:
                # Flatten errors into a single string
                try:
                    messages = []
                    for e in pw_err.error_list if hasattr(pw_err, 'error_list') else [pw_err]:
                        messages.append(str(e))
                    return Response({"detail": "; ".join(messages) or "Invalid password."}, status=status.HTTP_400_BAD_REQUEST)
                except Exception:
                    return Response({"detail": "Invalid password."}, status=status.HTTP_400_BAD_REQUEST)

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
                **extra_fields,
            )
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Helpful error in dev; generic in production
            if getattr(dj_settings, 'DEBUG', False):
                return Response({"detail": f"Registration error: {e}"}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "Registration failed. Please try again later."}, status=status.HTTP_400_BAD_REQUEST)

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
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

    @action(detail=False, methods=['get'], url_path='recommendations', permission_classes=[permissions.IsAuthenticated, IsActiveUser, IsStudent])
    def recommendations(self, request):
        user = request.user

        preferred_category = getattr(user, 'preferred_category', None)
        skill_level = getattr(user, 'skill_level', None)
        if not preferred_category or not skill_level:
            return Response([])

        # Map student skill -> allowed course difficulties
        # beginner -> easy
        # intermediate -> easy + medium
        # advanced -> easy + medium + hard
        allowed_by_skill = {
            'beginner': ['easy'],
            'intermediate': ['easy', 'medium'],
            'advanced': ['easy', 'medium', 'hard'],
        }
        allowed_difficulty = allowed_by_skill.get(str(skill_level).lower(), ['easy'])

        completed_ids = Enrollment.objects.filter(
            student=user,
            status='completed'
        ).values_list('course_id', flat=True)

        qs = (
            Course.objects.filter(
                is_published=True,
                category=preferred_category,
            )
            .filter(
                Q(difficulty_feedback_avg__isnull=True) |
                Q(difficulty_level__in=allowed_difficulty)
            )
            .exclude(id__in=completed_ids)
            .order_by('-published_at', '-created_at')
        )

        # Keep response small for dashboard
        try:
            limit = int(request.query_params.get('limit', '6'))
        except ValueError:
            limit = 6
        limit = max(1, min(limit, 24))

        serializer = CourseListSerializer(qs[:limit], many=True, context={'request': request})
        return Response(serializer.data)
    
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
    
    @action(detail=True, methods=['get'], url_path='ratings', permission_classes=[permissions.IsAuthenticated])
    def ratings(self, request, pk=None):
        """List ratings for this course (paginated if backend configured)."""
        course = self.get_object()
        qs = CourseRating.objects.filter(course=course).order_by('-updated_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = CourseRatingSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = CourseRatingSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='pending-reviews', permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def pending_reviews(self, request, pk=None):
        """List unread/unreplied reviews for this course (teacher/admin only)."""
        course = self.get_object()
        user = request.user
        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to view reviews for this course"}, status=status.HTTP_403_FORBIDDEN)
        qs = CourseRating.objects.filter(course=course, review__isnull=False).exclude(review="").filter(teacher_reply__isnull=True).order_by('-updated_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = CourseRatingSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = CourseRatingSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='rate', permission_classes=[permissions.IsAuthenticated, IsStudent])
    def rate(self, request, pk=None):
        """Create or update the authenticated student's rating for this course.

        Constraints:
        - Student must be enrolled in the course
        - Enrollment status must be 'completed'
        - rating must be 1..5
        - optional review text
        """
        course = self.get_object()
        user = request.user

        # Ensure enrollment exists and is completed (auto-heal completion if progress just reached 100%)
        enrollment = Enrollment.objects.filter(student=user, course=course).first()
        if not enrollment:
            # If no enrollment but a certificate exists, permit rating (legacy/cleanup compatibility)
            try:
                has_certificate_no_enrollment = Certificate.objects.filter(student=user, course=course).exists()
            except Exception:
                has_certificate_no_enrollment = False
            if not has_certificate_no_enrollment:
                return Response({"detail": "You must be enrolled in this course to rate it."}, status=status.HTTP_400_BAD_REQUEST)
        if enrollment.status != 'completed':
            # Attempt to finalize completion now if requirements are met
            try:
                enrollment.check_completion_and_issue_certificate()
                enrollment.refresh_from_db(fields=["status"])  # Reload status
            except Exception:
                pass

            # Additional safety: consider certificate presence OR computed progress
            if enrollment.status != 'completed':
                try:
                    has_certificate = Certificate.objects.filter(student=user, course=course).exists()
                except Exception:
                    has_certificate = False
                try:
                    progress_now = float(enrollment.calculate_progress())
                except Exception:
                    progress_now = 0.0
                if has_certificate or progress_now >= 100.0:
                    enrollment.status = 'completed'
                    enrollment.save(update_fields=['status'])
                else:
                    return Response({"detail": "You can rate only after completing the course."}, status=status.HTTP_400_BAD_REQUEST)

        # Accept optional rating; default to 5 if only feedback is sent
        try:
            rating_value = int(request.data.get('rating', 5))
        except (TypeError, ValueError):
            rating_value = 5
        rating_value = max(1, min(5, rating_value))
        review_text = request.data.get('review')

        # Optional: student-perceived difficulty feedback (easy/medium/hard)
        difficulty_feedback_raw = request.data.get('difficulty_feedback')
        difficulty_feedback = None
        if difficulty_feedback_raw is not None and str(difficulty_feedback_raw).strip() != '':
            s = str(difficulty_feedback_raw).strip().lower()
            if s in ('1', 'easy'):
                difficulty_feedback = 1
            elif s in ('2', 'medium'):
                difficulty_feedback = 2
            elif s in ('3', 'hard'):
                difficulty_feedback = 3
            else:
                return Response({"detail": "Invalid difficulty_feedback. Use easy, medium, or hard."}, status=status.HTTP_400_BAD_REQUEST)

        cr, created = CourseRating.objects.get_or_create(course=course, student=user, defaults={
            'rating': rating_value,
            'review': review_text or None,
            'difficulty_feedback': difficulty_feedback,
        })
        if not created:
            cr.rating = rating_value
            cr.review = review_text or None
            cr.difficulty_feedback = difficulty_feedback
            cr.save(update_fields=['rating', 'review', 'difficulty_feedback', 'updated_at'])

        # Award XP for first-time review with text
        if created and review_text:
            award_xp(user, XP_CONFIG['review_written'], 'review', f'Reviewed: {course.title}')
            stats = get_or_create_user_stats(user)
            stats.reviews_written += 1
            stats.save()
            check_and_award_badges(user)

        # Update course derived difficulty from average feedback (1..3)
        try:
            avg_val = CourseRating.objects.filter(course=course, difficulty_feedback__isnull=False).aggregate(a=Avg('difficulty_feedback')).get('a')
            if avg_val is not None:
                course.difficulty_feedback_avg = avg_val
                # Map average back to label
                if float(avg_val) <= 1.5:
                    course.difficulty_level = 'easy'
                elif float(avg_val) <= 2.5:
                    course.difficulty_level = 'medium'
                else:
                    course.difficulty_level = 'hard'
                course.save(update_fields=['difficulty_feedback_avg', 'difficulty_level'])
        except Exception:
            pass

        return Response(CourseRatingSerializer(cr).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reply-review', permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin])
    def reply_review(self, request, pk=None):
        """Teacher/Admin can reply to a student's review for this course.

        Body: { rating_id: number, reply: string }
        """
        course = self.get_object()
        user = request.user
        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to reply for this course"}, status=status.HTTP_403_FORBIDDEN)

        rating_id = request.data.get('rating_id')
        reply_text = (request.data.get('reply') or '').strip()
        if not rating_id or not reply_text:
            return Response({"detail": "rating_id and reply are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cr = CourseRating.objects.get(id=rating_id, course=course)
        except CourseRating.DoesNotExist:
            return Response({"detail": "Rating not found"}, status=status.HTTP_404_NOT_FOUND)

        cr.teacher_reply = reply_text
        cr.save(update_fields=['teacher_reply', 'updated_at'])
        return Response(CourseRatingSerializer(cr).data)
    
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
    
    @action(
        detail=True,
        methods=['get'],
        url_path='student-progress/(?P<student_id>[^/.]+)',
        permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin]
    )
    def student_progress(self, request, pk=None, student_id=None):
        """Return detailed course progress for a specific student in this course.

        Response structure:
        {
          student: { id, username, first_name, last_name, email },
          enrollment: { id, status, enrollment_date },
          overall_progress: number, // percent 0..100
          modules: [
            { id, title, order, total_content, completed_content, percent, assignments_total, assignments_passed }
          ],
          assignments: [
            { id, title, assignment_type, passing_grade, max_attempts, attempts_used, best_grade, passed, last_submission_date }
          ]
        }
        """
        course = self.get_object()
        user = request.user
        # Only the course's teacher (or admin) may access
        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to view data for this course"}, status=status.HTTP_403_FORBIDDEN)

        # Validate student
        student = get_object_or_404(User, pk=student_id, role='student')

        # Ensure student is enrolled in this course
        enrollment = Enrollment.objects.filter(student=student, course=course).first()
        if not enrollment:
            return Response({"detail": "Student is not enrolled in this course"}, status=status.HTTP_404_NOT_FOUND)

        # Overall progress via model helper
        try:
            overall = float(enrollment.calculate_progress())
        except Exception:
            overall = 0.0

        # Module-wise progress
        modules_data = []
        modules_qs = course.modules.all().order_by('order')
        for m in modules_qs:
            content_ids = list(Content.objects.filter(module=m).values_list('id', flat=True))
            total_content = len(content_ids)
            completed_content = 0
            if content_ids:
                completed_content = ContentProgress.objects.filter(
                    enrollment=enrollment,
                    content_id__in=content_ids,
                    completed=True
                ).count()

            # Assignments in this module
            mod_assignments = Assignment.objects.filter(course=course, module=m)
            assignments_total = mod_assignments.count()
            assignments_passed = 0
            for a in mod_assignments:
                best = AssignmentSubmission.objects.filter(
                    enrollment=enrollment,
                    assignment=a,
                    status='graded',
                ).order_by('-grade').first()
                if best and best.grade is not None and best.grade >= a.passing_grade:
                    assignments_passed += 1

            percent = 0.0
            denom = (total_content + assignments_total) or 1
            percent = round(((completed_content + assignments_passed) / denom) * 100, 1)

            modules_data.append({
                'id': m.id,
                'title': m.title,
                'order': m.order,
                'total_content': total_content,
                'completed_content': completed_content,
                'percent': percent,
                'assignments_total': assignments_total,
                'assignments_passed': assignments_passed,
            })

        # Assignment details
        assignments_data = []
        for a in Assignment.objects.filter(course=course).order_by('id'):
            subs = AssignmentSubmission.objects.filter(enrollment=enrollment, assignment=a)
            attempts_used = subs.count()
            best = subs.filter(status='graded').order_by('-grade').first()
            best_grade = float(best.grade) if best and best.grade is not None else None
            passed = bool(best_grade is not None and best_grade >= float(a.passing_grade))
            last_sub = subs.order_by('-submission_date').first()
            last_dt = last_sub.submission_date if last_sub else None

            assignments_data.append({
                'id': a.id,
                'title': a.title,
                'assignment_type': a.assignment_type,
                'passing_grade': a.passing_grade,
                'max_attempts': a.max_attempts,
                'attempts_used': attempts_used,
                'best_grade': best_grade,
                'passed': passed,
                'last_submission_date': last_dt,
            })

        data = {
            'student': UserSerializer(student).data,
            'enrollment': {
                'id': enrollment.id,
                'status': enrollment.status,
                'enrollment_date': enrollment.enrollment_date,
            },
            'overall_progress': overall,
            'modules': modules_data,
            'assignments': assignments_data,
        }
        return Response(data)
    
    @action(
        detail=True,
        methods=['get'],
        url_path='student-submissions/(?P<student_id>[^/.]+)',
        permission_classes=[permissions.IsAuthenticated, IsTeacherOrAdmin]
    )
    def student_submissions(self, request, pk=None, student_id=None):
        """Return full submission history for a specific student across all assignments in this course.

        Response example:
        {
          student: { ... },
          enrollment_id: number,
          assignments: [
            {
              id, title, assignment_type, passing_grade, max_attempts,
              best_grade, passed,
              submissions: [ { id, attempt_number, submission_date, grade, status, feedback } ]
            }
          ]
        }
        """
        course = self.get_object()
        user = request.user
        # Only the course's teacher (or admin) may access
        if user.role == 'teacher' and course.teacher_id != user.id:
            return Response({"detail": "You don't have permission to view data for this course"}, status=status.HTTP_403_FORBIDDEN)

        # Validate student and enrollment
        student = get_object_or_404(User, pk=student_id, role='student')
        enrollment = Enrollment.objects.filter(student=student, course=course).first()
        if not enrollment:
            return Response({"detail": "Student is not enrolled in this course"}, status=status.HTTP_404_NOT_FOUND)

        data = {
            'student': UserSerializer(student).data,
            'enrollment_id': enrollment.id,
            'assignments': []
        }

        assignments = Assignment.objects.filter(course=course).order_by('id')
        for a in assignments:
            subs_qs = AssignmentSubmission.objects.filter(enrollment=enrollment, assignment=a).order_by('attempt_number')
            subs_ser = AssignmentSubmissionSerializer(subs_qs, many=True)
            best = subs_qs.filter(status='graded').order_by('-grade').first()
            best_grade = float(best.grade) if best and best.grade is not None else None
            passed = bool(best_grade is not None and best_grade >= float(a.passing_grade))
            data['assignments'].append({
                'id': a.id,
                'title': a.title,
                'assignment_type': a.assignment_type,
                'passing_grade': a.passing_grade,
                'max_attempts': a.max_attempts,
                'best_grade': best_grade,
                'passed': passed,
                'submissions': subs_ser.data,
            })

        return Response(data)
    
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
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
                
                # Validate video file size (Cloudinary free plan limit: 100MB)
                if file_provided:
                    video_file = self.request.FILES.get('video')
                    max_size = 100 * 1024 * 1024  # 100MB for Cloudinary free plan
                    if video_file.size > max_size:
                        size_mb = round(video_file.size / (1024 * 1024), 2)
                        raise serializers.ValidationError({
                            'video': f'Video file is too large ({size_mb}MB). Maximum allowed size is 100MB for Cloudinary free plan.'
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
        
        # Handle video file replacement if a new video file is uploaded
        if instance.content_type == 'video' and 'video' in self.request.FILES:
            video_file = self.request.FILES.get('video')
            if video_file:
                # Validate file size (100MB limit for Cloudinary free plan)
                max_size = 100 * 1024 * 1024  # 100MB
                if video_file.size > max_size:
                    size_mb = round(video_file.size / (1024 * 1024), 2)
                    raise serializers.ValidationError({
                        'video': f'Video file is too large ({size_mb}MB). Maximum allowed size is 100MB for Cloudinary free plan.'
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
        
        first_time_completion = False
        if created:
            first_time_completion = True
        elif not content_progress.completed:
            content_progress.completed = True
            content_progress.completed_date = timezone.now()
            content_progress.save()
            first_time_completion = True
        
        # Award XP for first-time content completion
        if first_time_completion:
            award_xp(user, XP_CONFIG['content_complete'], 'content', f'Completed: {content.title}')
            record_daily_activity(user, content_completed=1, xp_earned=XP_CONFIG['content_complete'])
            check_and_award_badges(user)
        
        # Check if this affects course completion
        course_completed = enrollment.check_completion_and_issue_certificate()
        
        # Award XP for course completion
        if course_completed:
            award_xp(user, XP_CONFIG['course_complete'], 'course', f'Completed course: {enrollment.course.title}')
            stats = get_or_create_user_stats(user)
            stats.courses_completed += 1
            stats.save()
            check_and_award_badges(user)
        
        return Response({"detail": "Content marked as completed"})

class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Enrollment.objects.all()
        elif user.role == 'teacher':
            return Enrollment.objects.filter(course__teacher=user)
        else:
            return Enrollment.objects.filter(student=user)

    @action(detail=False, methods=['get'], url_path='stats/monthly', permission_classes=[permissions.IsAuthenticated])
    def stats_monthly(self, request):
        """Return monthly enrollment counts for the last N months (default 6).

        Response format: [{"month": "Jan", "enrollments": 12}, ...]
        """
        try:
            months_param = int(request.query_params.get('months', '6'))
        except ValueError:
            months_param = 6
        months_param = max(1, min(months_param, 24))

        now = timezone.now()
        # First day of the current month at midnight
        first_of_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Helper to shift months relative to a date (works without external deps)
        def shift_months(dt, delta):
            m = dt.month - 1 + delta
            y = dt.year + m // 12
            m = m % 12 + 1
            return dt.replace(year=y, month=m, day=1)

        start_date = shift_months(first_of_current, -(months_param - 1))

        # Aggregate enrollments by month using the DB, scoped by role
        user = request.user
        if user.role == 'admin':
            base_qs = Enrollment.objects.filter(enrollment_date__gte=start_date)
        elif user.role == 'teacher':
            base_qs = Enrollment.objects.filter(course__teacher=user, enrollment_date__gte=start_date)
        else:
            base_qs = Enrollment.objects.filter(student=user, enrollment_date__gte=start_date)
        aggregated = (
            base_qs
            .annotate(month=TruncMonth('enrollment_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        # Build a map for fast lookup
        counts_by_month = {item['month'].date(): item['count'] for item in aggregated}

        # Produce a continuous series including months with 0
        series = []
        cursor = start_date
        for _ in range(months_param):
            key = cursor.date()
            month_label = cursor.strftime('%b')
            series.append({
                'month': month_label,
                'year': cursor.year,
                'month_key': cursor.strftime('%Y-%m'),
                'enrollments': int(counts_by_month.get(key, 0))
            })
            cursor = shift_months(cursor, 1)

        return Response(series)

    @action(detail=False, methods=['post'], url_path='refresh-completion', permission_classes=[permissions.IsAuthenticated])
    def refresh_completion(self, request):
        """Recalculate progress and issue certificates for the current user's enrollments if completed."""
        user = request.user
        if user.role == 'student':
            enrollments = Enrollment.objects.filter(student=user)
        else:
            enrollments = Enrollment.objects.none()

        completed_now = 0
        for e in enrollments:
            before = e.status
            try:
                e.check_completion_and_issue_certificate()
                e.refresh_from_db(fields=["status"])  # ensure latest status
            except Exception:
                pass
            if before != 'completed' and e.status == 'completed':
                completed_now += 1

        return Response({"updated_to_completed": completed_now})

class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
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
                # Award XP for graded MCQ submission
                self._award_assignment_xp(user, assignment, submission, attempts_used + 1)
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
                # Award XP for graded QA submission
                self._award_assignment_xp(user, assignment, submission, attempts_used + 1)
        except Enrollment.DoesNotExist:
            return Response({"detail": "You are not enrolled in this course"}, 
                            status=status.HTTP_400_BAD_REQUEST)
    
    def _award_assignment_xp(self, user, assignment, submission, attempt_number):
        """Award XP for assignment completion with bonuses for perfect scores and first attempts"""
        if submission.grade is None or submission.status != 'graded':
            return
        
        passed = submission.grade >= assignment.passing_grade
        if not passed:
            return
        
        # Base XP for passing
        total_xp = XP_CONFIG['assignment_pass']
        description = f'Passed: {assignment.title}'
        
        # First attempt bonus
        if attempt_number == 1:
            total_xp += XP_CONFIG['first_attempt_pass']
            description += ' (First attempt!)'
        
        # Perfect score bonus
        if submission.grade >= 100:
            total_xp += XP_CONFIG['perfect_score']
            description += ' (Perfect!)'
            stats = get_or_create_user_stats(user)
            stats.perfect_scores += 1
            stats.save()
        
        award_xp(user, total_xp, 'assignment', description)
        
        # Update stats
        stats = get_or_create_user_stats(user)
        stats.assignments_completed += 1
        stats.save()
        
        record_daily_activity(user, assignments_completed=1, xp_earned=total_xp)
        check_and_award_badges(user)
    
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
            # Check if this is the first time being graded (for XP)
            was_ungraded = submission.status != 'graded'
            submission.grade_submission(grade, feedback)
            
            # Award XP for first-time grading
            if was_ungraded:
                student = submission.enrollment.student
                self._award_assignment_xp(
                    student, 
                    submission.assignment, 
                    submission, 
                    submission.attempt_number
                )
            
            return Response(AssignmentSubmissionSerializer(submission).data)
        else:
            return Response({"detail": "You don't have permission to grade this submission"}, 
                            status=status.HTTP_403_FORBIDDEN)

class AssignmentQuestionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentQuestionSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]

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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]

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

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        """Send an announcement to specific users by IDs or emails (admin only).

        Payload options:
        - {"user_ids": [1,2], "title": "...", "message": "...", "notif_type": "info"}
        - {"emails": ["a@x.com","b@y.com"], "title": "...", "message": "..."}
        - Both can be provided; they will be unioned.
        """
        user = request.user
        if getattr(user, 'role', None) != 'admin':
            return Response({"detail": "Only admin can send notifications."}, status=status.HTTP_403_FORBIDDEN)

        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        notif_type = (request.data.get('notif_type') or 'info').strip()
        if not title or not message:
            return Response({"detail": "Both title and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        ids = request.data.get('user_ids') or []
        emails = request.data.get('emails') or []
        try:
            id_list = [int(i) for i in ids if str(i).strip()]
        except Exception:
            id_list = []
        email_list = []
        for e in emails:
            try:
                em = str(e).strip().lower()
                if em:
                    email_list.append(em)
            except Exception:
                pass

        # Resolve user queryset
        qs = User.objects.filter(is_active=True)
        q = Q()
        if id_list:
            q |= Q(id__in=id_list)
        if email_list:
            q |= Q(email__in=email_list)
        recipients = list(qs.filter(q)) if q else []
        if not recipients:
            return Response({'success': True, 'created': 0})

        Notification.objects.bulk_create([
            Notification(user=u, title=title, message=message, notif_type=notif_type)
            for u in recipients
        ])

        # Best-effort email via Django if available (non-blocking)
        try:
            from django.conf import settings as dj_settings
            sender = getattr(dj_settings, 'DEFAULT_FROM_EMAIL', 'no-reply@edu.pk')
            for u in recipients:
                if u.email:
                    try:
                        send_mail(title, message, sender, [u.email], fail_silently=True)
                    except Exception:
                        pass
        except Exception:
            pass

        return Response({'success': True, 'created': len(recipients)})

    @action(detail=False, methods=['post'], url_path='send_to_emails')
    def send_to_emails(self, request):
        """Compat wrapper that forwards to send() using only emails field."""
        return self.send(request)

class SupportRequestViewSet(viewsets.ModelViewSet):
    """Public create endpoint for blocked users to request help.

    Admins can list and close requests.
    """
    serializer_class = SupportRequestSerializer
    queryset = SupportRequest.objects.all()

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.AllowAny()]
        # list/retrieve/update only for admins
        return [permissions.IsAuthenticated(), IsTeacherOrAdmin()]

    def get_queryset(self):
        # Admins see all; teachers can also view (per IsTeacherOrAdmin), but in practice it's admin use.
        return SupportRequest.objects.all()

    def create(self, request, *args, **kwargs):
        email = (request.data.get('email') or '').strip()
        username = (request.data.get('username') or '').strip() or None
        reason_seen = (request.data.get('reason_seen') or '').strip() or None
        until_raw = request.data.get('until_reported')
        message = (request.data.get('message') or '').strip() or None

        if not email:
            return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

        until_reported = None
        if until_raw:
            try:
                parsed = datetime.fromisoformat(str(until_raw).replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    until_reported = timezone.make_aware(parsed)
                else:
                    until_reported = parsed.astimezone(dt_timezone.utc)
            except Exception:
                until_reported = None

        # Try to link to a user
        user = None
        try:
            if username:
                user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.filter(email=email).first()
        except Exception:
            user = None

        # Clean reason to remove trailing auto-unblock sentence if present
        clean_reason = reason_seen
        try:
            if reason_seen:
                marker_idx = reason_seen.lower().find('you will be automatically unblocked')
                if marker_idx != -1:
                    clean_reason = reason_seen[:marker_idx].strip()
        except Exception:
            pass

        sr = SupportRequest.objects.create(
            user=user,
            email=email,
            username=username,
            reason_seen=clean_reason,
            until_reported=until_reported,
            message=message,
        )

        # Notify admins in-app
        admins = User.objects.filter(role='admin', is_active=True)
        if admins.exists():
            Notification.objects.bulk_create([
                Notification(
                    user=a,
                    title="Unblock request",
                    message=f"Support request #{sr.id} from {email}. Reason: {clean_reason or 'N/A'}",
                    notif_type='support'
                ) for a in admins
            ])

        # Attempt to email the admin address if configured
        try:
            from django.conf import settings
            admin_email = getattr(settings, 'SUPPORT_ADMIN_EMAIL', None) or 'admin@edu.pk'
            subject = f"[LMS] Unblock request #{sr.id}"
            body_lines = [
                f"Email: {email}",
                f"Username: {username or 'N/A'}",
                f"Reason shown: {clean_reason or 'N/A'}",
                f"Auto-unblock (reported): {until_reported or 'N/A'}",
                f"Message: {message or 'N/A'}",
                f"Created at: {sr.created_at}",
            ]
            # Send to admin and cc the user
            recipients = [admin_email]
            if email and email not in recipients:
                recipients.append(email)
            send_mail(subject, "\n".join(body_lines), admin_email, recipients, fail_silently=True)
        except Exception:
            pass

        return Response(SupportRequestSerializer(sr).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({"detail": "Only admin can close support requests."}, status=status.HTTP_403_FORBIDDEN)
        sr = self.get_object()
        sr.status = 'closed'
        sr.handled_at = timezone.now()
        sr.handled_by = request.user
        sr.save(update_fields=['status', 'handled_at', 'handled_by'])
        return Response(SupportRequestSerializer(sr).data)


class JazzCashReturnView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Handle JazzCash return/callback, verify hash, update payment, and redirect to frontend."""
        data = request.data if isinstance(request.data, dict) else request.POST
        sandbox_mode = getattr(dj_settings, 'JAZZCASH_SANDBOX', False)
        pp_secure_hash = data.get('pp_SecureHash')
        
        if getattr(dj_settings, 'DEBUG', False):
            try:
                print("[JazzCashReturnView] Incoming data:", dict(data))
                print("[JazzCashReturnView] Sandbox mode:", sandbox_mode)
                print("[JazzCashReturnView] Provided pp_SecureHash:", pp_secure_hash)
            except Exception:
                pass

        # In sandbox mode, skip ALL hash verification for local testing
        if not sandbox_mode:
            if not pp_secure_hash:
                return Response({"detail": "Missing secure hash."}, status=status.HTTP_400_BAD_REQUEST)

            # Recompute secure hash from response fields (excluding pp_SecureHash)
            fields_for_hash = {k: v for k, v in data.items() if k != 'pp_SecureHash' and v not in [None, ""]}
            sorted_string = "&".join(f"{key}={value}" for key, value in sorted(fields_for_hash.items()))
            # JazzCash requires integrity salt to be prepended to the message before hashing
            message_to_hash = dj_settings.JAZZCASH_INTEGRITY_SALT + "&" + sorted_string
            expected_hash = hmac.new(
                dj_settings.JAZZCASH_INTEGRITY_SALT.encode(),
                message_to_hash.encode(),
                hashlib.sha256,
            ).hexdigest()

            if not hmac.compare_digest(expected_hash.lower(), pp_secure_hash.lower()):
                return Response({"detail": "Invalid secure hash."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            print("[JazzCashReturnView] Hash verification SKIPPED in sandbox mode.")

        payment_id = data.get('ppmpf_1')
        if not payment_id:
            return Response({"detail": "Missing payment reference."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        # Store response metadata for auditing
        metadata = payment.metadata or {}
        metadata['jazzcash_response'] = dict(data)
        payment.metadata = metadata
        payment.payment_intent_id = data.get('pp_TxnRefNo') or payment.payment_intent_id

        response_code = data.get('pp_ResponseCode')
        # In sandbox mode, treat ALL callbacks as success for local testing
        # (JazzCash sandbox rejects localhost URLs with code 110, but we still want to test the flow)
        is_success = (response_code == '000') or sandbox_mode
        
        if sandbox_mode and response_code != '000':
            print(f"[JazzCashReturnView] Sandbox mode: treating response code {response_code} as SUCCESS for testing.")

        if is_success:
            if payment.status != 'completed':
                payment.status = 'completed'
                payment.transaction_id = data.get('pp_AuthCode') or payment.transaction_id
                payment.failure_reason = None
                payment.save()
                payment.mark_as_completed()
            redirect_url = f"{dj_settings.FRONTEND_BASE_URL}/app/courses/{payment.course.id}?payment_status=success"
        else:
            if payment.status != 'completed':
                payment.status = 'failed'
                payment.failure_reason = f"JazzCash error code {response_code}"
                payment.save()
            redirect_url = f"{dj_settings.FRONTEND_BASE_URL}/app/courses/{payment.course.id}?payment_status=failed"

        # Redirect browser back to frontend SPA
        return Response(status=status.HTTP_302_FOUND, headers={"Location": redirect_url})


# Payment ViewSet
class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]

    def _stripe_amount_minor(self, amount) -> int:
        try:
            dec = amount if isinstance(amount, Decimal) else Decimal(str(amount))
        except Exception:
            dec = Decimal('0')
        return int((dec * Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

    def _stripe_configured(self) -> bool:
        return bool(stripe and getattr(dj_settings, 'STRIPE_SECRET_KEY', '') and getattr(dj_settings, 'STRIPE_CURRENCY', ''))

    def _stripe_setup_api_key(self):
        if not stripe:
            raise RuntimeError('Stripe SDK is not installed.')
        stripe.api_key = dj_settings.STRIPE_SECRET_KEY

    def _stripe_fulfill(self, payment: Payment, payment_intent: dict):
        expected_amount = self._stripe_amount_minor(payment.amount)
        expected_currency = (dj_settings.STRIPE_CURRENCY or 'pkr').lower()

        pi_amount = int(payment_intent.get('amount') or 0)
        pi_currency = str(payment_intent.get('currency') or '').lower()
        pi_status = payment_intent.get('status')

        if pi_currency != expected_currency:
            raise ValueError('Currency mismatch.')
        if pi_amount != expected_amount:
            raise ValueError('Amount mismatch.')

        if pi_status != 'succeeded':
            raise ValueError(f"PaymentIntent not succeeded (status: {pi_status}).")

        if payment.status != 'completed':
            payment.status = 'completed'
            payment.payment_date = timezone.now()
            payment.failure_reason = None
            payment.payment_intent_id = payment_intent.get('id') or payment.payment_intent_id

            metadata = payment.metadata or {}
            metadata['stripe_payment_intent_status'] = pi_status
            metadata['stripe_amount'] = pi_amount
            metadata['stripe_currency'] = pi_currency
            payment.metadata = metadata

            latest_charge_id = payment_intent.get('latest_charge')
            if latest_charge_id:
                payment.transaction_id = latest_charge_id
                try:
                    charge = stripe.Charge.retrieve(latest_charge_id)
                    pmd = charge.get('payment_method_details') or {}
                    card = pmd.get('card') or {}
                    if card.get('last4'):
                        payment.card_last4 = str(card.get('last4'))
                    if card.get('brand'):
                        payment.card_brand = str(card.get('brand'))
                except Exception:
                    pass

            payment.save()
            enrollment = payment.mark_as_completed()
            return enrollment

        return Enrollment.objects.filter(student=payment.student, course=payment.course).first()
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        elif user.role == 'student':
            return Payment.objects.filter(student=user)
        elif user.role == 'teacher':
            # Teachers can see payments for their courses
            return Payment.objects.filter(course__teacher=user)
        return Payment.objects.none()
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def initiate(self, request):
        """
        Initiate a payment for a course
        Expected payload: {
            "course_id": 1,
            "payment_method": "stripe" or "jazzcash"
        }
        """
        if request.user.role != 'student':
            return Response(
                {"detail": "Only students can make payments."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        course_id = request.data.get('course_id')
        payment_method = request.data.get('payment_method', 'stripe')
        
        if not course_id:
            return Response(
                {"detail": "course_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            course = Course.objects.get(id=course_id, is_published=True)
        except Course.DoesNotExist:
            return Response(
                {"detail": "Course not found or not published."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already enrolled
        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {"detail": "You are already enrolled in this course."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending payment
        existing_payment = Payment.objects.filter(
            student=request.user,
            course=course,
            status='pending'
        ).first()
        
        if existing_payment:
            return Response(
                PaymentSerializer(existing_payment).data,
                status=status.HTTP_200_OK
            )
        
        # Create new payment record
        payment = Payment.objects.create(
            student=request.user,
            course=course,
            amount=course.price,
            payment_method=payment_method,
            status='pending'
        )
        
        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def process(self, request, pk=None):
        """
        Process payment with card/payment details
        For now, this is a mock implementation that will be replaced with actual gateway integration
        Expected payload: {
            "card_number": "4242424242424242",
            "card_holder": "John Doe",
            "expiry_date": "12/25",
            "cvv": "123",
            // For JazzCash
            "phone_number": "03001234567"
        }
        """
        payment = self.get_object()

        if payment.payment_method == 'jazzcash':
            return Response(
                {"detail": "JazzCash payments are handled via hosted checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Card payments are processed via Stripe Elements. Use the Stripe create_intent + fulfill flow."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def stripe_create_intent(self, request, pk=None):
        payment = self.get_object()

        if request.user.role != 'student':
            return Response({"detail": "Only students can make payments."}, status=status.HTTP_403_FORBIDDEN)

        if payment.student != request.user:
            return Response({"detail": "You can only create intents for your own payments."}, status=status.HTTP_403_FORBIDDEN)

        if payment.payment_method != 'stripe':
            return Response({"detail": "Stripe intent can only be created for Stripe payments."}, status=status.HTTP_400_BAD_REQUEST)

        if Enrollment.objects.filter(student=request.user, course=payment.course).exists():
            return Response({"detail": "You are already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)

        if payment.status not in ['pending', 'processing']:
            return Response({"detail": f"Payment is already {payment.status}."}, status=status.HTTP_400_BAD_REQUEST)

        if not stripe:
            return Response({"detail": "Stripe SDK is not installed on the server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not getattr(dj_settings, 'STRIPE_SECRET_KEY', ''):
            return Response({"detail": "Stripe secret key is not configured on the server."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        self._stripe_setup_api_key()

        amount_minor = self._stripe_amount_minor(payment.amount)
        if amount_minor <= 0:
            return Response({"detail": "Invalid payment amount."}, status=status.HTTP_400_BAD_REQUEST)

        currency = (dj_settings.STRIPE_CURRENCY or 'pkr').lower()

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_minor,
                currency=currency,
                automatic_payment_methods={"enabled": True},
                receipt_email=getattr(request.user, 'email', '') or None,
                metadata={
                    "payment_id": str(payment.id),
                    "course_id": str(payment.course.id),
                    "student_id": str(payment.student.id),
                },
            )

            payment.payment_intent_id = intent.get('id')
            payment.status = 'processing'
            metadata = payment.metadata or {}
            metadata['stripe_amount'] = amount_minor
            metadata['stripe_currency'] = currency
            payment.metadata = metadata
            payment.save(update_fields=['payment_intent_id', 'status', 'metadata', 'updated_at'])

            return Response(
                {
                    'client_secret': intent.get('client_secret'),
                    'payment_intent_id': intent.get('id'),
                },
                status=status.HTTP_200_OK,
            )

        except stripe.error.StripeError as e:
            message = getattr(e, 'user_message', None) or str(e)
            logger.exception('Stripe create intent error')
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Stripe create intent unexpected error')
            return Response({"detail": f"Unable to create payment intent: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def stripe_fulfill(self, request, pk=None):
        payment = self.get_object()

        if request.user.role != 'student':
            return Response({"detail": "Only students can make payments."}, status=status.HTTP_403_FORBIDDEN)

        if payment.student != request.user:
            return Response({"detail": "You can only fulfill your own payments."}, status=status.HTTP_403_FORBIDDEN)

        if payment.payment_method != 'stripe':
            return Response({"detail": "Stripe fulfillment can only be used for Stripe payments."}, status=status.HTTP_400_BAD_REQUEST)

        if not stripe:
            return Response({"detail": "Stripe SDK is not installed on the server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not getattr(dj_settings, 'STRIPE_SECRET_KEY', ''):
            return Response({"detail": "Stripe secret key is not configured on the server."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payment_intent_id = request.data.get('payment_intent_id') or payment.payment_intent_id
        if not payment_intent_id:
            return Response({"detail": "payment_intent_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if payment.payment_intent_id and payment.payment_intent_id != payment_intent_id:
            return Response({"detail": "PaymentIntent ID mismatch."}, status=status.HTTP_400_BAD_REQUEST)

        self._stripe_setup_api_key()

        try:
            pi = stripe.PaymentIntent.retrieve(payment_intent_id)

            pi_meta = pi.get('metadata') or {}
            if pi_meta.get('payment_id') and str(pi_meta.get('payment_id')) != str(payment.id):
                return Response({"detail": "PaymentIntent does not belong to this payment."}, status=status.HTTP_400_BAD_REQUEST)

            if payment.status == 'completed':
                enrollment = Enrollment.objects.filter(student=payment.student, course=payment.course).first()
                return Response(
                    {
                        'already_fulfilled': True,
                        'payment': PaymentSerializer(payment).data,
                        'enrollment': EnrollmentSerializer(enrollment).data if enrollment else None,
                    },
                    status=status.HTTP_200_OK,
                )

            enrollment = self._stripe_fulfill(payment, pi)

            return Response(
                {
                    'payment': PaymentSerializer(payment).data,
                    'enrollment': EnrollmentSerializer(enrollment).data if enrollment else None,
                    'message': 'Payment fulfilled successfully.',
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            message = getattr(e, 'user_message', None) or str(e)
            logger.exception('Stripe fulfill error')
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Stripe fulfill unexpected error')
            return Response({"detail": f"Unable to fulfill payment: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def my_payments(self, request):
        """Get current user's payment history"""
        if request.user.role != 'student':
            return Response(
                {"detail": "Only students have payment history."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payments = Payment.objects.filter(student=request.user).order_by('-created_at')
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsActiveUser])
    def jazzcash_init(self, request, pk=None):
        """Create a signed JazzCash payload for hosted checkout."""
        payment = self.get_object()

        if payment.student != request.user:
            return Response(
                {"detail": "You can only initiate sessions for your own payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if payment.payment_method != 'jazzcash':
            return Response(
                {"detail": "JazzCash session can only be created for JazzCash payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status not in ['pending', 'processing']:
            return Response(
                {"detail": f"Payment is already {payment.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional phone number for metadata purposes
        phone_number = request.data.get('phone_number', '')

        amount_pkr = payment.amount or 0
        try:
            amount_int = int(amount_pkr * 100)
        except Exception:
            amount_int = int(float(str(amount_pkr)) * 100)

        current_datetime = timezone.now()
        pp_TxnDateTime = current_datetime.strftime('%Y%m%d%H%M%S')
        expiry_datetime = current_datetime + timedelta(hours=1)
        pp_TxnExpiryDateTime = expiry_datetime.strftime('%Y%m%d%H%M%S')
        pp_TxnRefNo = f"T{pp_TxnDateTime}{payment.id}"

        post_data = {
            "pp_Version": "1.1",
            "pp_TxnType": "",
            "pp_Language": "EN",
            "pp_MerchantID": dj_settings.JAZZCASH_MERCHANT_ID,
            "pp_SubMerchantID": "",
            "pp_Password": dj_settings.JAZZCASH_PASSWORD,
            "pp_BankID": "TBANK",
            "pp_ProductID": "RETL",
            "pp_TxnRefNo": pp_TxnRefNo,
            "pp_Amount": str(amount_int),
            "pp_TxnCurrency": "PKR",
            "pp_TxnDateTime": pp_TxnDateTime,
            "pp_BillReference": f"course-{payment.course.id}",
            "pp_Description": f"Course payment #{payment.id}",
            "pp_TxnExpiryDateTime": pp_TxnExpiryDateTime,
            "pp_ReturnURL": dj_settings.JAZZCASH_RETURN_URL,
            "pp_SecureHash": "",
            "ppmpf_1": str(payment.id),
            "ppmpf_2": str(payment.course.id),
            "ppmpf_3": str(payment.student.id),
            "ppmpf_4": phone_number,
        }

        fields_for_hash = {k: v for k, v in post_data.items() if v not in [None, ""]}
        sorted_string = "&".join(f"{key}={value}" for key, value in sorted(fields_for_hash.items()))
        # JazzCash requires integrity salt to be prepended to the message before hashing
        message_to_hash = dj_settings.JAZZCASH_INTEGRITY_SALT + "&" + sorted_string
        secure_hash = hmac.new(
            dj_settings.JAZZCASH_INTEGRITY_SALT.encode(),
            message_to_hash.encode(),
            hashlib.sha256,
        ).hexdigest()
        post_data["pp_SecureHash"] = secure_hash

        metadata = payment.metadata or {}
        metadata["jazzcash_request"] = post_data
        payment.metadata = metadata
        payment.payment_intent_id = pp_TxnRefNo
        payment.status = "processing"
        payment.save(update_fields=["metadata", "payment_intent_id", "status"])

        return Response(
            {
                "post_url": dj_settings.JAZZCASH_POST_URL,
                "fields": post_data,
            },
            status=status.HTTP_200_OK,
        )


class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        secret = getattr(dj_settings, 'STRIPE_WEBHOOK_SECRET', '')
        if not secret:
            # Webhooks are optional in this project. If no webhook secret is configured,
            # we silently no-op to avoid retries/noise in sandbox setups.
            return Response(status=status.HTTP_204_NO_CONTENT)

        if not stripe:
            logger.warning('Stripe webhook received but Stripe SDK is not installed.')
            return Response({"detail": "Stripe SDK is not installed on the server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            stripe.api_key = getattr(dj_settings, 'STRIPE_SECRET_KEY', '')
            event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=secret)
        except ValueError:
            return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Keep import-safe behavior: don't reference stripe.error in an except clause.
            if hasattr(stripe, 'error') and isinstance(e, stripe.error.SignatureVerificationError):
                return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)
            logger.exception('Stripe webhook construct_event error')
            return Response({"detail": "Webhook error."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get('type')
        obj = (event.get('data') or {}).get('object') or {}

        try:
            if event_type == 'payment_intent.succeeded':
                meta = obj.get('metadata') or {}
                payment_id = meta.get('payment_id')
                if payment_id:
                    payment = Payment.objects.filter(id=payment_id, payment_method='stripe').first()
                    if payment and payment.status != 'completed':
                        viewset = PaymentViewSet()
                        viewset._stripe_setup_api_key()
                        viewset._stripe_fulfill(payment, obj)
                return Response({"received": True}, status=status.HTTP_200_OK)

            if event_type == 'payment_intent.payment_failed':
                meta = obj.get('metadata') or {}
                payment_id = meta.get('payment_id')
                if payment_id:
                    payment = Payment.objects.filter(id=payment_id, payment_method='stripe').first()
                    if payment and payment.status != 'completed':
                        payment.status = 'failed'
                        last_err = obj.get('last_payment_error') or {}
                        msg = last_err.get('message')
                        payment.failure_reason = msg or 'Payment failed.'
                        metadata = payment.metadata or {}
                        metadata['stripe_payment_intent_status'] = obj.get('status')
                        payment.metadata = metadata
                        payment.save(update_fields=['status', 'failure_reason', 'metadata', 'updated_at'])
                return Response({"received": True}, status=status.HTTP_200_OK)

            return Response({"received": True}, status=status.HTTP_200_OK)

        except Exception:
            logger.exception('Stripe webhook handler error')
            return Response({"detail": "Webhook handler error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== GAMIFICATION VIEWS ====================

# XP amounts for different actions
XP_CONFIG = {
    'content_complete': 10,
    'assignment_pass': 30,
    'perfect_score': 20,  # bonus
    'first_attempt_pass': 20,  # bonus
    'course_complete': 200,
    'review_written': 15,
    'streak_bonus_multiplier': 2,  # per streak day
}

# Default badges to be seeded
DEFAULT_BADGES = [
    # Streak badges
    {'code': 'streak_7', 'name': '7-Day Warrior', 'description': 'Maintain a 7-day learning streak', 'badge_type': 'streak', 'icon': '🔥', 'xp_reward': 50, 'requirement_value': 7},
    {'code': 'streak_30', 'name': '30-Day Champion', 'description': 'Maintain a 30-day learning streak', 'badge_type': 'streak', 'icon': '⚡', 'xp_reward': 150, 'requirement_value': 30},
    {'code': 'streak_100', 'name': '100-Day Legend', 'description': 'Maintain a 100-day learning streak', 'badge_type': 'streak', 'icon': '👑', 'xp_reward': 500, 'requirement_value': 100},
    # Completion badges
    {'code': 'first_course', 'name': 'First Steps', 'description': 'Complete your first course', 'badge_type': 'completion', 'icon': '🎓', 'xp_reward': 100, 'requirement_value': 1},
    {'code': 'courses_5', 'name': 'Knowledge Seeker', 'description': 'Complete 5 courses', 'badge_type': 'completion', 'icon': '📚', 'xp_reward': 200, 'requirement_value': 5},
    {'code': 'courses_10', 'name': 'Course Master', 'description': 'Complete 10 courses', 'badge_type': 'completion', 'icon': '🏅', 'xp_reward': 400, 'requirement_value': 10},
    # Performance badges
    {'code': 'perfect_score', 'name': 'Perfect Score', 'description': 'Get 100% on any assignment', 'badge_type': 'performance', 'icon': '💯', 'xp_reward': 50, 'requirement_value': 1},
    {'code': 'quick_learner', 'name': 'Quick Learner', 'description': 'Complete a course in under 7 days', 'badge_type': 'performance', 'icon': '🚀', 'xp_reward': 100, 'requirement_value': 7},
    # Engagement badges
    {'code': 'reviewer', 'name': 'Reviewer', 'description': 'Write your first course review', 'badge_type': 'engagement', 'icon': '⭐', 'xp_reward': 30, 'requirement_value': 1},
    {'code': 'top_3', 'name': 'Top 3', 'description': 'Rank in top 3 on weekly leaderboard', 'badge_type': 'engagement', 'icon': '🏆', 'xp_reward': 100, 'requirement_value': 3},
]


def get_or_create_user_stats(user):
    """Get or create UserStats for a user"""
    stats, created = UserStats.objects.get_or_create(user=user)
    return stats


def award_xp(user, amount, source, description=""):
    """Award XP to user and return updated stats"""
    stats = get_or_create_user_stats(user)
    stats.add_xp(amount, source, description)
    return stats


def check_and_award_badges(user):
    """Check and award any badges the user has earned"""
    stats = get_or_create_user_stats(user)
    newly_earned = []
    
    for badge_data in DEFAULT_BADGES:
        # Check if user already has this badge
        if UserBadge.objects.filter(user=user, badge__code=badge_data['code']).exists():
            continue
        
        badge = Badge.objects.filter(code=badge_data['code']).first()
        if not badge:
            continue
        
        earned = False
        
        # Check streak badges
        if badge.badge_type == 'streak':
            if stats.current_streak >= badge.requirement_value or stats.longest_streak >= badge.requirement_value:
                earned = True
        
        # Check completion badges
        elif badge.badge_type == 'completion':
            if stats.courses_completed >= badge.requirement_value:
                earned = True
        
        # Check performance badges
        elif badge.badge_type == 'performance':
            if badge.code == 'perfect_score' and stats.perfect_scores >= badge.requirement_value:
                earned = True
            # Quick learner is checked separately when course is completed
        
        # Check engagement badges
        elif badge.badge_type == 'engagement':
            if badge.code == 'reviewer' and stats.reviews_written >= badge.requirement_value:
                earned = True
            # Top 3 is checked separately
        
        if earned:
            UserBadge.objects.create(user=user, badge=badge)
            # Award badge XP
            if badge.xp_reward > 0:
                award_xp(user, badge.xp_reward, 'badge', f'Earned badge: {badge.name}')
            newly_earned.append(badge)
    
    return newly_earned


def record_daily_activity(user, content_completed=0, assignments_completed=0, xp_earned=0, time_spent_seconds=0):
    """Record or update daily activity for a user"""
    from datetime import date
    today = date.today()
    
    activity, created = DailyActivity.objects.get_or_create(
        user=user,
        date=today,
        defaults={
            'content_completed': content_completed,
            'assignments_completed': assignments_completed,
            'xp_earned': xp_earned,
            'time_spent_seconds': time_spent_seconds
        }
    )
    
    if not created:
        activity.content_completed += content_completed
        activity.assignments_completed += assignments_completed
        activity.xp_earned += xp_earned
        activity.time_spent_seconds += time_spent_seconds
        activity.save()
    
    # Update streak
    stats = get_or_create_user_stats(user)
    stats.update_streak()
    
    return activity


class GamificationViewSet(viewsets.ViewSet):
    """ViewSet for gamification-related endpoints"""
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]
    
    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """Get current user's gamification stats"""
        stats = get_or_create_user_stats(request.user)
        return Response(UserStatsSerializer(stats).data)
    
    @action(detail=False, methods=['get'])
    def my_badges(self, request):
        """Get current user's badges"""
        badges = UserBadge.objects.filter(user=request.user).select_related('badge')
        return Response(UserBadgeSerializer(badges, many=True).data)
    
    @action(detail=False, methods=['get'])
    def all_badges(self, request):
        """Get all available badges with user's earned status"""
        all_badges = Badge.objects.filter(is_active=True)
        earned_codes = set(
            UserBadge.objects.filter(user=request.user).values_list('badge__code', flat=True)
        )
        
        result = []
        for badge in all_badges:
            badge_data = BadgeSerializer(badge).data
            badge_data['earned'] = badge.code in earned_codes
            if badge.code in earned_codes:
                ub = UserBadge.objects.filter(user=request.user, badge=badge).first()
                badge_data['earned_at'] = ub.earned_at if ub else None
            result.append(badge_data)
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def xp_history(self, request):
        """Get user's XP transaction history"""
        transactions = XPTransaction.objects.filter(user=request.user)[:50]
        return Response(XPTransactionSerializer(transactions, many=True).data)
    
    @action(detail=False, methods=['get'], url_path='user-badges/(?P<user_id>[^/.]+)')
    def user_badges(self, request, user_id=None):
        """Get badges for a specific user (admin only)"""
        if request.user.role != 'admin':
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        badges = UserBadge.objects.filter(user=user).select_related('badge')
        return Response(UserBadgeSerializer(badges, many=True).data)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get weekly leaderboard"""
        from datetime import date, timedelta
        
        # Calculate week start (Monday)
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        # Get weekly XP for all users
        weekly_xp = {}
        transactions = XPTransaction.objects.filter(
            created_at__date__gte=week_start
        ).values('user_id').annotate(weekly_xp=Count('amount'))
        
        # Actually sum the amounts
        from django.db.models import Sum
        transactions = XPTransaction.objects.filter(
            created_at__date__gte=week_start
        ).values('user_id').annotate(weekly_xp=Sum('amount'))
        
        for t in transactions:
            weekly_xp[t['user_id']] = t['weekly_xp'] or 0
        
        # Get all user stats, ordered by total XP
        all_stats = UserStats.objects.filter(
            user__role='student',
            user__is_active=True
        ).select_related('user').order_by('-total_xp')[:50]
        
        leaderboard = []
        for rank, stats in enumerate(all_stats, 1):
            entry = {
                'rank': rank,
                'user_id': stats.user.id,
                'username': stats.user.username,
                'first_name': stats.user.first_name or '',
                'last_name': stats.user.last_name or '',
                'total_xp': stats.total_xp,
                'level': stats.level,
                'level_title': stats.level_title,
                'current_streak': stats.current_streak,
                'weekly_xp': weekly_xp.get(stats.user.id, 0),
            }
            leaderboard.append(entry)
        
        # Sort by weekly XP for weekly leaderboard
        leaderboard.sort(key=lambda x: x['weekly_xp'], reverse=True)
        
        # Update ranks after sorting
        for i, entry in enumerate(leaderboard, 1):
            entry['rank'] = i
        
        # Find current user's position
        my_rank = None
        for entry in leaderboard:
            if entry['user_id'] == request.user.id:
                my_rank = entry['rank']
                break
        
        return Response({
            'leaderboard': leaderboard[:20],
            'my_rank': my_rank,
            'week_start': week_start.isoformat(),
        })
    
    @action(detail=False, methods=['post'])
    def record_activity(self, request):
        """Record learning activity (used by frontend to update streak)"""
        time_spent = request.data.get('time_spent_seconds', 0)
        
        activity = record_daily_activity(
            request.user,
            time_spent_seconds=time_spent
        )
        
        # Check for newly earned badges
        newly_earned = check_and_award_badges(request.user)
        
        stats = get_or_create_user_stats(request.user)
        
        return Response({
            'stats': UserStatsSerializer(stats).data,
            'newly_earned_badges': BadgeSerializer(newly_earned, many=True).data,
        })
    
    @action(detail=False, methods=['post'])
    def seed_badges(self, request):
        """Seed default badges (admin only)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Only admins can seed badges.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        created_count = 0
        for badge_data in DEFAULT_BADGES:
            badge, created = Badge.objects.get_or_create(
                code=badge_data['code'],
                defaults=badge_data
            )
            if created:
                created_count += 1
        
        return Response({
            'message': f'Seeded {created_count} new badges.',
            'total_badges': Badge.objects.count()
        })
