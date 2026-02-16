---
description: Step-by-step guide to implement the AI chatbot agent with Gemini
---

# AI Chatbot Implementation Workflow (Gemini Edition)

This workflow guides you through implementing the role-based AI chatbot agent using **Google Gemini API** with **PostgreSQL function calling**.

## Prerequisites

1. **API Key Required**:
   - Google Gemini API key (free tier available)
   - Get it from: https://aistudio.google.com/app/apikey

2. **Python Packages**:
   ```bash
   pip install google-generativeai psycopg2-binary
   ```

3. **Environment Variables**:
   Add to `backend/.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash-exp
   ```

---

## Phase 1: Backend Setup (Days 1-3)

### Step 1: Install Dependencies

```bash
cd backend
pip install google-generativeai==0.8.3
pip freeze > requirements.txt
```

### Step 2: Create Database Models

Create `backend/lms_backend/myapp/chatbot_models.py`:

```python
from django.db import models
from .models import User

class ChatMessage(models.Model):
    """Store chat history for context and analytics"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=20)  # student, teacher, admin
    query = models.TextField()
    response = models.TextField()
    function_calls = models.JSONField(default=list)  # Track which DB functions were called
    created_at = models.DateTimeField(auto_now_add=True)
    feedback = models.CharField(max_length=20, null=True, blank=True)
    response_time_ms = models.IntegerField(null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.query[:50]}"
```

Import in `backend/lms_backend/myapp/models.py`:
```python
from .chatbot_models import ChatMessage
```

### Step 3: Create Migrations

```bash
cd backend/lms_backend
python manage.py makemigrations
python manage.py migrate
```

### Step 4: Create PostgreSQL Function Service

Create directory: `backend/lms_backend/api/services/`

Create `backend/lms_backend/api/services/__init__.py`:
```python
# Empty file to make this a package
```

Create `backend/lms_backend/api/services/postgres_functions.py`:

```python
from django.db.models import Avg, Count, Q
from myapp.models import Course, User, Enrollment
from typing import List, Dict, Optional

class PostgreSQLFunctions:
    """Database query functions for Gemini function calling"""
    
    @staticmethod
    def get_courses_by_filters(
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Retrieve courses with filters.
        
        Args:
            category: Course category filter
            difficulty: Difficulty level (easy, medium, hard)
            min_rating: Minimum average rating
            max_price: Maximum price
            limit: Maximum number of results
        
        Returns:
            List of course dictionaries
        """
        courses = Course.objects.filter(status='approved')
        
        if category:
            courses = courses.filter(category__icontains=category)
        if difficulty:
            courses = courses.filter(difficulty_level=difficulty.lower())
        if max_price:
            courses = courses.filter(price__lte=max_price)
        
        courses = courses[:limit]
        
        results = []
        for course in courses:
            ratings = course.ratings.all()
            avg_rating = ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0
            
            if min_rating and avg_rating < min_rating:
                continue
            
            results.append({
                'id': course.id,
                'title': course.title,
                'category': course.category or 'Uncategorized',
                'description': course.description[:200] + '...' if len(course.description) > 200 else course.description,
                'difficulty_level': course.difficulty_level,
                'instructor_name': course.instructor.get_full_name() if course.instructor else 'Unknown',
                'instructor_id': course.instructor.id if course.instructor else None,
                'price': float(course.price) if course.price else 0.0,
                'average_rating': round(avg_rating, 2),
                'rating_count': ratings.count(),
                'enrollment_count': course.enrollments.count(),
                'completion_rate': PostgreSQLFunctions._calculate_completion_rate(course.enrollments.all()),
            })
        
        return results
    
    @staticmethod
    def get_course_details(course_id: int) -> Dict:
        """
        Get detailed information about a specific course.
        
        Args:
            course_id: ID of the course
        
        Returns:
            Course details dictionary
        """
        try:
            course = Course.objects.get(id=course_id, status='approved')
            ratings = course.ratings.all()
            enrollments = course.enrollments.all()
            
            return {
                'id': course.id,
                'title': course.title,
                'category': course.category or 'Uncategorized',
                'description': course.description,
                'difficulty_level': course.difficulty_level,
                'duration': course.duration or 'Not specified',
                'instructor_name': course.instructor.get_full_name() if course.instructor else 'Unknown',
                'instructor_id': course.instructor.id if course.instructor else None,
                'price': float(course.price) if course.price else 0.0,
                'average_rating': round(ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0, 2),
                'rating_count': ratings.count(),
                'enrollment_count': enrollments.count(),
                'completion_rate': PostgreSQLFunctions._calculate_completion_rate(enrollments),
                'modules_count': course.modules.count(),
                'created_at': course.created_at.isoformat() if course.created_at else None,
            }
        except Course.DoesNotExist:
            return {'error': 'Course not found'}
    
    @staticmethod
    def get_top_rated_courses(limit: int = 10) -> List[Dict]:
        """
        Get highest-rated courses.
        
        Args:
            limit: Maximum number of results
        
        Returns:
            List of top-rated courses
        """
        courses = Course.objects.filter(status='approved')
        
        course_ratings = []
        for course in courses:
            avg_rating = course.ratings.aggregate(Avg('rating'))['rating__avg']
            if avg_rating and course.ratings.count() >= 5:  # At least 5 reviews
                course_ratings.append((course, avg_rating))
        
        course_ratings.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for course, avg_rating in course_ratings[:limit]:
            results.append({
                'id': course.id,
                'title': course.title,
                'category': course.category or 'Uncategorized',
                'instructor_name': course.instructor.get_full_name() if course.instructor else 'Unknown',
                'average_rating': round(avg_rating, 2),
                'rating_count': course.ratings.count(),
                'enrollment_count': course.enrollments.count(),
                'price': float(course.price) if course.price else 0.0,
            })
        
        return results
    
    @staticmethod
    def get_trending_courses(days: int = 30, limit: int = 10) -> List[Dict]:
        """
        Get courses with most recent enrollments.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of results
        
        Returns:
            List of trending courses
        """
        from datetime import timedelta
        from django.utils import timezone
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        courses = Course.objects.filter(status='approved').annotate(
            recent_enrollments=Count(
                'enrollments',
                filter=Q(enrollments__enrolled_at__gte=cutoff_date)
            )
        ).order_by('-recent_enrollments')[:limit]
        
        results = []
        for course in courses:
            results.append({
                'id': course.id,
                'title': course.title,
                'category': course.category or 'Uncategorized',
                'instructor_name': course.instructor.get_full_name() if course.instructor else 'Unknown',
                'recent_enrollments': course.recent_enrollments,
                'total_enrollments': course.enrollments.count(),
                'average_rating': round(course.ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0, 2),
                'price': float(course.price) if course.price else 0.0,
            })
        
        return results
    
    @staticmethod
    def get_instructor_info(instructor_id: int) -> Dict:
        """
        Get instructor details and statistics.
        
        Args:
            instructor_id: ID of the instructor
        
        Returns:
            Instructor information dictionary
        """
        try:
            instructor = User.objects.get(id=instructor_id, role='teacher')
            courses = instructor.courses_taught.filter(status='approved')
            all_enrollments = Enrollment.objects.filter(course__in=courses)
            
            return {
                'id': instructor.id,
                'name': instructor.get_full_name(),
                'total_courses': courses.count(),
                'total_students': all_enrollments.values('student').distinct().count(),
                'average_course_rating': round(
                    courses.aggregate(avg_rating=Avg('ratings__rating'))['avg_rating'] or 0.0,
                    2
                ),
                'total_enrollments': all_enrollments.count(),
            }
        except User.DoesNotExist:
            return {'error': 'Instructor not found'}
    
    @staticmethod
    def get_instructor_courses(instructor_id: int) -> List[Dict]:
        """
        Get all courses taught by an instructor.
        
        Args:
            instructor_id: ID of the instructor
        
        Returns:
            List of instructor's courses
        """
        try:
            instructor = User.objects.get(id=instructor_id, role='teacher')
            courses = instructor.courses_taught.filter(status='approved')
            
            results = []
            for course in courses:
                results.append({
                    'id': course.id,
                    'title': course.title,
                    'category': course.category or 'Uncategorized',
                    'average_rating': round(course.ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0, 2),
                    'enrollment_count': course.enrollments.count(),
                    'price': float(course.price) if course.price else 0.0,
                })
            
            return results
        except User.DoesNotExist:
            return [{'error': 'Instructor not found'}]
    
    @staticmethod
    def get_top_instructors(limit: int = 10) -> List[Dict]:
        """
        Get instructors with highest average ratings.
        
        Args:
            limit: Maximum number of results
        
        Returns:
            List of top instructors
        """
        instructors = User.objects.filter(role='teacher')
        
        instructor_ratings = []
        for instructor in instructors:
            courses = instructor.courses_taught.filter(status='approved')
            if courses.exists():
                avg_rating = courses.aggregate(avg_rating=Avg('ratings__rating'))['avg_rating']
                if avg_rating:
                    instructor_ratings.append((instructor, avg_rating, courses.count()))
        
        instructor_ratings.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for instructor, avg_rating, course_count in instructor_ratings[:limit]:
            all_enrollments = Enrollment.objects.filter(course__instructor=instructor)
            results.append({
                'id': instructor.id,
                'name': instructor.get_full_name(),
                'average_rating': round(avg_rating, 2),
                'total_courses': course_count,
                'total_students': all_enrollments.values('student').distinct().count(),
            })
        
        return results
    
    @staticmethod
    def get_student_enrollments(student_id: int, requesting_user_id: int, role: str) -> List[Dict]:
        """
        Get student's enrolled courses (privacy-protected).
        
        Args:
            student_id: ID of the student
            requesting_user_id: ID of user making the request
            role: Role of requesting user
        
        Returns:
            List of enrollments or error
        """
        if role != 'admin' and student_id != requesting_user_id:
            return [{'error': 'Access denied: You can only view your own enrollments'}]
        
        try:
            student = User.objects.get(id=student_id, role='student')
            enrollments = student.enrollments.all()
            
            results = []
            for enrollment in enrollments:
                results.append({
                    'course_id': enrollment.course.id,
                    'course_title': enrollment.course.title,
                    'progress_percentage': enrollment.calculate_progress(),
                    'status': enrollment.status,
                    'enrolled_at': enrollment.enrolled_at.isoformat(),
                })
            
            return results
        except User.DoesNotExist:
            return [{'error': 'Student not found'}]
    
    @staticmethod
    def get_student_progress(student_id: int, requesting_user_id: int, role: str) -> Dict:
        """
        Get student's learning progress (privacy-protected).
        
        Args:
            student_id: ID of the student
            requesting_user_id: ID of user making the request
            role: Role of requesting user
        
        Returns:
            Student progress dictionary or error
        """
        if role != 'admin' and student_id != requesting_user_id:
            return {'error': 'Access denied: You can only view your own progress'}
        
        try:
            student = User.objects.get(id=student_id, role='student')
            enrollments = student.enrollments.all()
            
            return {
                'student_id': student.id,
                'student_name': student.get_full_name(),
                'total_enrollments': enrollments.count(),
                'completed_courses': enrollments.filter(status='completed').count(),
                'in_progress_courses': enrollments.filter(status='active').count(),
                'total_xp': student.stats.total_xp if hasattr(student, 'stats') else 0,
                'level': student.stats.level if hasattr(student, 'stats') else 'Beginner',
                'current_streak': student.stats.current_streak if hasattr(student, 'stats') else 0,
                'certificates_earned': student.certificates.count(),
            }
        except User.DoesNotExist:
            return {'error': 'Student not found'}
    
    @staticmethod
    def get_teacher_course_stats(teacher_id: int, requesting_user_id: int, role: str) -> List[Dict]:
        """
        Get statistics for teacher's courses (privacy-protected).
        
        Args:
            teacher_id: ID of the teacher
            requesting_user_id: ID of user making the request
            role: Role of requesting user
        
        Returns:
            List of course statistics or error
        """
        if role != 'admin' and teacher_id != requesting_user_id:
            return [{'error': 'Access denied: You can only view your own course statistics'}]
        
        try:
            teacher = User.objects.get(id=teacher_id, role='teacher')
            courses = teacher.courses_taught.filter(status='approved')
            
            results = []
            for course in courses:
                enrollments = course.enrollments.all()
                results.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'total_enrollments': enrollments.count(),
                    'active_students': enrollments.filter(status='active').count(),
                    'completed_students': enrollments.filter(status='completed').count(),
                    'completion_rate': PostgreSQLFunctions._calculate_completion_rate(enrollments),
                    'average_rating': round(course.ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0, 2),
                    'rating_count': course.ratings.count(),
                })
            
            return results
        except User.DoesNotExist:
            return [{'error': 'Teacher not found'}]
    
    @staticmethod
    def get_platform_statistics(requesting_user_id: int, role: str) -> Dict:
        """
        Get platform-wide statistics (admin only).
        
        Args:
            requesting_user_id: ID of user making the request
            role: Role of requesting user
        
        Returns:
            Platform statistics or error
        """
        if role != 'admin':
            return {'error': 'Access denied: Admin access required'}
        
        return {
            'total_users': User.objects.count(),
            'total_students': User.objects.filter(role='student').count(),
            'total_teachers': User.objects.filter(role='teacher').count(),
            'total_courses': Course.objects.filter(status='approved').count(),
            'total_enrollments': Enrollment.objects.count(),
            'active_enrollments': Enrollment.objects.filter(status='active').count(),
            'completed_enrollments': Enrollment.objects.filter(status='completed').count(),
        }
    
    @staticmethod
    def get_low_performing_courses(threshold: float = 40.0, requesting_user_id: int, role: str) -> List[Dict]:
        """
        Get courses with low completion rates (admin only).
        
        Args:
            threshold: Completion rate threshold
            requesting_user_id: ID of user making the request
            role: Role of requesting user
        
        Returns:
            List of low-performing courses or error
        """
        if role != 'admin':
            return [{'error': 'Access denied: Admin access required'}]
        
        courses = Course.objects.filter(status='approved')
        
        results = []
        for course in courses:
            enrollments = course.enrollments.all()
            if enrollments.count() >= 10:
                completion_rate = PostgreSQLFunctions._calculate_completion_rate(enrollments)
                if completion_rate < threshold:
                    results.append({
                        'course_id': course.id,
                        'course_title': course.title,
                        'instructor_name': course.instructor.get_full_name() if course.instructor else 'Unknown',
                        'completion_rate': completion_rate,
                        'total_enrollments': enrollments.count(),
                        'average_rating': round(course.ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0, 2),
                    })
        
        results.sort(key=lambda x: x['completion_rate'])
        return results
    
    @staticmethod
    def _calculate_completion_rate(enrollments) -> float:
        """Calculate percentage of completed enrollments"""
        if not enrollments.exists():
            return 0.0
        
        total = enrollments.count()
        completed = enrollments.filter(status='completed').count()
        return round((completed / total) * 100, 2)
```

### Step 5: Create Gemini Service

Create `backend/lms_backend/api/services/gemini_service.py`:

```python
import google.generativeai as genai
import os
from typing import List, Dict
from .postgres_functions import PostgreSQLFunctions

class GeminiChatbotService:
    """Manage Gemini API interactions with function calling"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        self.postgres_functions = PostgreSQLFunctions()
    
    def get_system_instruction(self, role: str, user_context: Dict) -> str:
        """Generate role-specific system instruction"""
        if role == 'student':
            return f"""You are an AI learning assistant for students on an e-learning platform.

Your role is to help students discover courses, compare options, and track their progress.

AVAILABLE TOOLS:
You have access to database functions to query course information, instructor details, and your own student data.

STRICT RULES:
1. ONLY use the database functions provided - never make up data
2. You can ONLY access your own student data (student_id: {user_context.get('student_id')})
3. Never reveal other students' data
4. If you cannot answer with available functions, say: "I don't have access to that information in the platform database."
5. Always cite specific data when making recommendations
6. Be encouraging and supportive
7. Format responses clearly with bullet points and numbers

Current Student: {user_context.get('name', 'Student')}
Level: {user_context.get('level', 'Beginner')}
Total XP: {user_context.get('total_xp', 0)}
Current Streak: {user_context.get('current_streak', 0)} days
"""
        
        elif role == 'teacher':
            return f"""You are an AI teaching assistant for instructors on an e-learning platform.

Your role is to help teachers analyze their course performance and student engagement.

AVAILABLE TOOLS:
You have access to database functions to query YOUR course statistics and student engagement metrics.

STRICT RULES:
1. ONLY use the database functions provided - never make up data
2. You can ONLY access YOUR own course data (teacher_id: {user_context.get('teacher_id')})
3. Never show data from other teachers' courses
4. Provide aggregated student data only - no individual student names
5. If you cannot answer, say: "I don't have access to that information in the platform database."
6. Offer constructive insights and improvement suggestions
7. Format responses clearly with statistics and trends

Current Teacher: {user_context.get('name', 'Teacher')}
Teacher ID: {user_context.get('teacher_id')}
Total Courses: {user_context.get('total_courses', 0)}
Total Students: {user_context.get('total_students', 0)}
"""
        
        elif role == 'admin':
            return f"""You are an AI administrative assistant for platform administrators.

Your role is to help admins monitor platform performance and make data-driven decisions.

AVAILABLE TOOLS:
You have access to ALL database functions for platform-wide analytics and insights.

STRICT RULES:
1. ONLY use the database functions provided - never make up data
2. Protect user privacy when appropriate
3. If you cannot answer, say: "I don't have access to that information in the platform database."
4. Highlight trends and provide actionable insights
5. Format responses clearly with statistics and recommendations

Platform Statistics:
- Total Courses: {user_context.get('total_courses', 0)}
- Total Students: {user_context.get('total_students', 0)}
- Total Enrollments: {user_context.get('total_enrollments', 0)}
"""
        
        return "You are a helpful AI assistant for an e-learning platform."
    
    def get_available_functions(self, role: str, user_id: int):
        """Return functions available to this role"""
        # Common functions for all roles
        functions = [
            self.postgres_functions.get_courses_by_filters,
            self.postgres_functions.get_course_details,
            self.postgres_functions.get_top_rated_courses,
            self.postgres_functions.get_trending_courses,
            self.postgres_functions.get_instructor_info,
            self.postgres_functions.get_instructor_courses,
            self.postgres_functions.get_top_instructors,
        ]
        
        # Role-specific functions
        if role == 'student':
            # Create wrapper functions that auto-inject user_id and role
            def get_my_enrollments():
                """Get your enrolled courses"""
                return self.postgres_functions.get_student_enrollments(user_id, user_id, role)
            
            def get_my_progress():
                """Get your learning progress and statistics"""
                return self.postgres_functions.get_student_progress(user_id, user_id, role)
            
            functions.extend([get_my_enrollments, get_my_progress])
        
        elif role == 'teacher':
            def get_my_course_stats():
                """Get statistics for your courses"""
                return self.postgres_functions.get_teacher_course_stats(user_id, user_id, role)
            
            functions.append(get_my_course_stats)
        
        elif role == 'admin':
            def get_platform_stats():
                """Get platform-wide statistics"""
                return self.postgres_functions.get_platform_statistics(user_id, role)
            
            def get_low_courses(threshold: float = 40.0):
                """Get courses with low completion rates"""
                return self.postgres_functions.get_low_performing_courses(threshold, user_id, role)
            
            # Admin also gets student/teacher functions with full access
            def get_any_student_enrollments(student_id: int):
                """Get any student's enrollments"""
                return self.postgres_functions.get_student_enrollments(student_id, user_id, role)
            
            def get_any_student_progress(student_id: int):
                """Get any student's progress"""
                return self.postgres_functions.get_student_progress(student_id, user_id, role)
            
            def get_any_teacher_stats(teacher_id: int):
                """Get any teacher's course statistics"""
                return self.postgres_functions.get_teacher_course_stats(teacher_id, user_id, role)
            
            functions.extend([
                get_platform_stats,
                get_low_courses,
                get_any_student_enrollments,
                get_any_student_progress,
                get_any_teacher_stats
            ])
        
        return functions
    
    def chat(self, query: str, role: str, user_context: Dict) -> Dict:
        """Send query to Gemini with function calling enabled"""
        user_id = user_context.get('user_id') or user_context.get('student_id') or user_context.get('teacher_id')
        
        # Get available functions for this role
        available_functions = self.get_available_functions(role, user_id)
        
        # Create model with tools
        model = genai.GenerativeModel(
            model_name=self.model_name,
            tools=available_functions,
            system_instruction=self.get_system_instruction(role, user_context)
        )
        
        # Start chat with automatic function calling
        chat = model.start_chat(enable_automatic_function_calling=True)
        
        # Send message
        response = chat.send_message(query)
        
        # Extract function calls made
        function_calls = []
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'function_call'):
                function_calls.append({
                    'name': part.function_call.name,
                    'args': dict(part.function_call.args)
                })
        
        return {
            'response': response.text,
            'function_calls': function_calls
        }
```

### Step 6: Create API Views

Add to `backend/lms_backend/api/views.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from myapp.chatbot_models import ChatMessage
from myapp.models import Course, Enrollment, User
from .services.gemini_service import GeminiChatbotService
import time

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_query(request):
    """Handle chatbot queries with Gemini"""
    query = request.data.get('query', '').strip()
    
    if not query:
        return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(query) > 500:
        return Response({'error': 'Query too long (max 500 characters)'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    role = user.role
    
    try:
        start_time = time.time()
        
        # Get user context
        user_context = _get_user_context(user, role)
        
        # Initialize Gemini service
        gemini_service = GeminiChatbotService()
        
        # Get response
        result = gemini_service.chat(query, role, user_context)
        
        response_time = int((time.time() - start_time) * 1000)
        
        # Save to history
        chat_message = ChatMessage.objects.create(
            user=user,
            role=role,
            query=query,
            response=result['response'],
            function_calls=result['function_calls'],
            response_time_ms=response_time
        )
        
        return Response({
            'message_id': chat_message.id,
            'response': result['response'],
            'function_calls': result['function_calls'],
            'response_time_ms': response_time
        })
    
    except Exception as e:
        return Response({
            'error': 'An error occurred processing your query',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """Get user's chat history"""
    limit = int(request.query_params.get('limit', 50))
    messages = ChatMessage.objects.filter(user=request.user)[:limit]
    
    return Response({
        'messages': [{
            'id': msg.id,
            'query': msg.query,
            'response': msg.response,
            'created_at': msg.created_at.isoformat(),
            'feedback': msg.feedback,
            'function_calls': msg.function_calls
        } for msg in messages]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_feedback(request, message_id):
    """Submit feedback on chatbot response"""
    feedback = request.data.get('feedback')
    
    if feedback not in ['helpful', 'not_helpful']:
        return Response({'error': 'Invalid feedback value'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        message = ChatMessage.objects.get(id=message_id, user=request.user)
        message.feedback = feedback
        message.save()
        
        return Response({'status': 'success'})
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

def _get_user_context(user, role):
    """Build user context for Gemini"""
    context = {
        'name': user.get_full_name(),
        'user_id': user.id
    }
    
    if role == 'student':
        context['student_id'] = user.id
        if hasattr(user, 'stats'):
            context.update({
                'level': user.stats.level,
                'total_xp': user.stats.total_xp,
                'current_streak': user.stats.current_streak
            })
        else:
            context.update({
                'level': 'Beginner',
                'total_xp': 0,
                'current_streak': 0
            })
    
    elif role == 'teacher':
        context['teacher_id'] = user.id
        courses = user.courses_taught.filter(status='approved')
        total_students = sum(course.enrollments.count() for course in courses)
        context.update({
            'total_courses': courses.count(),
            'total_students': total_students
        })
    
    elif role == 'admin':
        context.update({
            'total_courses': Course.objects.filter(status='approved').count(),
            'total_students': User.objects.filter(role='student').count(),
            'total_enrollments': Enrollment.objects.count()
        })
    
    return context
```

### Step 7: Add URL Routes

Add to `backend/lms_backend/api/urls.py`:

```python
from django.urls import path
from .views import (
    chatbot_query,
    chat_history,
    chat_feedback
)

urlpatterns = [
    # ... existing routes ...
    
    # Chatbot routes
    path('chatbot/query/', chatbot_query, name='chatbot_query'),
    path('chatbot/history/', chat_history, name='chat_history'),
    path('chatbot/feedback/<int:message_id>/', chat_feedback, name='chat_feedback'),
]
```

### Step 8: Test the API

```bash
# Start server
python manage.py runserver

# Test with curl (replace YOUR_JWT_TOKEN)
curl -X POST http://localhost:8000/api/chatbot/query/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the best course for AI?"}'
```

---

## Phase 2: Frontend Integration (Days 4-5)

### Step 9: Create API Client

Create `e-learning-ui/src/api/chatbot.ts`:

```typescript
import apiClient from './apiClient';

export interface ChatMessage {
  id: number;
  query: string;
  response: string;
  created_at: string;
  feedback?: 'helpful' | 'not_helpful';
  function_calls?: Array<{name: string; args: any}>;
}

export interface ChatQueryResponse {
  message_id: number;
  response: string;
  function_calls: Array<{name: string; args: any}>;
  response_time_ms: number;
}

export const chatbotApi = {
  sendQuery: async (query: string): Promise<ChatQueryResponse> => {
    const response = await apiClient.post('/api/chatbot/query/', { query });
    return response.data;
  },

  getChatHistory: async (limit: number = 50): Promise<{ messages: ChatMessage[] }> => {
    const response = await apiClient.get(`/api/chatbot/history/?limit=${limit}`);
    return response.data;
  },

  submitFeedback: async (messageId: number, feedback: 'helpful' | 'not_helpful'): Promise<void> => {
    await apiClient.post(`/api/chatbot/feedback/${messageId}/`, { feedback });
  }
};
```

### Step 10: Create Chat Widget Component

Create `e-learning-ui/src/components/chatbot/ChatWidget.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, ThumbsUp, ThumbsDown, Loader2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { chatbotApi } from '@/api/chatbot';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string | number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  function_calls?: Array<{name: string; args: any}>;
  feedback?: 'helpful' | 'not_helpful';
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const sendMessageMutation = useMutation({
    mutationFn: chatbotApi.sendQuery,
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: data.message_id,
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        function_calls: data.function_calls
      }]);
      setInput('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send message',
        variant: 'destructive'
      });
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, feedback }: { messageId: number; feedback: 'helpful' | 'not_helpful' }) =>
      chatbotApi.submitFeedback(messageId, feedback),
    onSuccess: (_, variables) => {
      setMessages(prev => prev.map(msg =>
        msg.id === variables.messageId ? { ...msg, feedback: variables.feedback } : msg
      ));
      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve',
      });
    }
  });

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    sendMessageMutation.mutate(input);
  };

  const handleFeedback = (messageId: number, feedback: 'helpful' | 'not_helpful') => {
    feedbackMutation.mutate({ messageId, feedback });
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 group animate-pulse"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[650px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              AI Learning Assistant
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Powered by Gemini</span>
            </h3>
            <p className="text-white/80 text-xs">Ask me anything about courses</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Close chat"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="font-medium mb-2 text-lg">How can I help you today?</p>
            <p className="text-sm text-gray-400 mb-4">Ask me about courses, instructors, or your progress</p>
            <div className="space-y-2 text-xs text-left max-w-xs mx-auto">
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                💡 "What is the best course for AI?"
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                📊 "Show me trending courses"
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                🎓 "Compare Python courses"
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[85%] ${message.type === 'user' ? 'ml-auto' : 'mr-auto'}`}>
              <div className={`p-4 rounded-2xl ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md rounded-bl-sm border border-gray-200 dark:border-gray-700'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {message.function_calls && message.function_calls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 text-xs opacity-75">
                    <p className="font-semibold mb-1">🔍 Data sources:</p>
                    {message.function_calls.map((fc, idx) => (
                      <p key={idx} className="mb-1">• {fc.name.replace(/_/g, ' ')}</p>
                    ))}
                  </div>
                )}
              </div>
              
              {message.type === 'bot' && typeof message.id === 'number' && (
                <div className="mt-2 flex gap-2 items-center">
                  <span className="text-xs text-gray-400">Was this helpful?</span>
                  <button
                    onClick={() => handleFeedback(message.id as number, 'helpful')}
                    disabled={!!message.feedback}
                    className={`p-1 rounded transition-colors ${
                      message.feedback === 'helpful'
                        ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id as number, 'not_helpful')}
                    disabled={!!message.feedback}
                    className={`p-1 rounded transition-colors ${
                      message.feedback === 'not_helpful'
                        ? 'text-red-600 bg-red-100 dark:bg-red-900/30'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {sendMessageMutation.isPending && (
          <div className="text-left mb-4">
            <div className="inline-block bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-sm shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything..."
            className="flex-1 resize-none min-h-[60px] max-h-[120px]"
            rows={2}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || !input.trim()}
            className="self-end bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="icon"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Powered by Google Gemini • Answers based on platform data
        </p>
      </div>
    </div>
  );
};
```

### Step 11: Add Chat Widget to App

Modify `e-learning-ui/src/App.tsx`:

```typescript
import { ChatWidget } from '@/components/chatbot/ChatWidget';

function App() {
  return (
    <>
      {/* Existing app content */}
      <Routes>
        {/* ... your routes ... */}
      </Routes>
      
      {/* Add chatbot widget */}
      <ChatWidget />
    </>
  );
}
```

---

## Phase 3: Testing & Deployment (Days 6-7)

### Step 12: Test Role-Based Access

**Student Queries:**
```
"What is the best course for AI?"
"Which beginner courses are available?"
"Show me my enrolled courses"
"What is my learning progress?"
```

**Teacher Queries:**
```
"How many students are in my courses?"
"What is my average course rating?"
"Show me my course statistics"
```

**Admin Queries:**
```
"Which courses have the highest enrollments?"
"Show me platform statistics"
"Which courses need improvement?"
```

### Step 13: Environment Variables Checklist

Add to `backend/.env`:

```env
# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp

# Database (already configured)
DATABASE_URL=postgresql://...
```

### Step 14: Deployment Checklist

- [ ] Install dependencies (`pip install google-generativeai`)
- [ ] Set GEMINI_API_KEY environment variable
- [ ] Run migrations
- [ ] Test API endpoints
- [ ] Test frontend chat widget
- [ ] Test all role scenarios
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Monitor API usage

---

## Cost Estimation

**Gemini 2.0 Flash (Free Tier):**
- Up to 1,500 requests per day: **FREE**
- After that: $0.075 per 1M input tokens, $0.30 per 1M output tokens

**Monthly Cost (5,000 queries):**
- If within free tier: **$0**
- If paid tier: ~$1.13/month

**Comparison:**
- OpenAI GPT-3.5-turbo: ~$12.50/month
- **Gemini is 91% cheaper (or free)!**

---

## Troubleshooting

### Issue: "GEMINI_API_KEY not set"
```bash
# Add to backend/.env
GEMINI_API_KEY=your_key_here
```

### Issue: Function calling not working
- Ensure you're using `gemini-2.0-flash-exp` or `gemini-1.5-pro`
- Check that functions have proper docstrings
- Verify `enable_automatic_function_calling=True`

### Issue: Slow responses
- Use `gemini-2.0-flash-exp` (faster than 1.5-pro)
- Reduce number of available functions
- Optimize database queries

---

**Ready to start? Follow this workflow step by step!**
