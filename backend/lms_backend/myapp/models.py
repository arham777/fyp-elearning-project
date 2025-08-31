from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator

# Custom User Manager
class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, role='student', **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        if not username:
            raise ValueError('The Username field must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(username, email, password, **extra_fields)

# Custom User Model
class User(AbstractBaseUser, PermissionsMixin):
    ROLES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    )
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=10, choices=ROLES, default='student')
    created_at = models.DateTimeField(default=timezone.now)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

# Courses Model
class Course(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'teacher'}, related_name='courses_taught')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title

# Course Modules Model
class CourseModule(models.Model):
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    order = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    
    class Meta:
        ordering = ['order']
        unique_together = ('course', 'order')
        
    def __str__(self):
        return f"{self.course.title} - {self.title}"

# Content Model
class Content(models.Model):
    CONTENT_TYPES = (
        ('video', 'Video'),
        ('reading', 'Reading'),
    )
    id = models.AutoField(primary_key=True)
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='contents')
    title = models.CharField(max_length=200)
    content_type = models.CharField(max_length=10, choices=CONTENT_TYPES)
    url = models.URLField(null=True, blank=True)  # For videos (legacy URL)
    video = models.FileField(upload_to='videos/', null=True, blank=True)  # Local uploaded video
    text = models.TextField(null=True, blank=True)  # For readings
    order = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)  # Estimated time to complete
    
    class Meta:
        ordering = ['order']
        unique_together = ('module', 'order')
        
    def __str__(self):
        return f"{self.title} ({self.get_content_type_display()})"

# Enrollments Model
class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
    )
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'}, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrollment_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    class Meta:
        unique_together = ('student', 'course')  # Prevent duplicate enrollments

    def __str__(self):
        return f"{self.student.username} - {self.course.title}"
        
    def calculate_progress(self):
        """Calculate student's progress percentage in the course"""
        course = self.course
        
        # Get all content items in the course
        total_content_count = Content.objects.filter(module__course=course).count()
        completed_content_count = ContentProgress.objects.filter(
            enrollment=self,
            completed=True
        ).count()
        
        # Get all assignments in the course
        total_assignment_count = Assignment.objects.filter(course=course).count()
        completed_assignment_count = AssignmentSubmission.objects.filter(
            enrollment=self,
            status='graded',
            grade__gte=60  # Passing grade (60%)
        ).count()
        
        # Calculate total progress
        total_items = total_content_count + total_assignment_count
        if total_items == 0:
            return 0
        
        completed_items = completed_content_count + completed_assignment_count
        return round((completed_items / total_items) * 100, 1)  # Round to 1 decimal place
        
    def check_completion_and_issue_certificate(self):
        """Check if course is completed and issue certificate if needed"""
        # Calculate progress
        progress = self.calculate_progress()
        
        # Check if all course requirements are met (100% completion)
        if progress >= 100 and self.status != 'completed':
            # Mark enrollment as completed
            self.status = 'completed'
            self.save()
            
            # Check if certificate already exists
            certificate_exists = Certificate.objects.filter(
                student=self.student,
                course=self.course
            ).exists()
            
            if not certificate_exists:
                # Generate unique verification code
                import uuid
                verification_code = f"{uuid.uuid4().hex[:8].upper()}-{self.course.id}-{self.student.id}"
                
                # Create certificate
                Certificate.objects.create(
                    student=self.student,
                    course=self.course,
                    verification_code=verification_code
                )
                
                return True
        
        return False

# Content Progress Tracking
class ContentProgress(models.Model):
    id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='content_progress')
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_date = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.IntegerField(default=0)  # Track time spent on content
    
    class Meta:
        unique_together = ('enrollment', 'content')
        
    def __str__(self):
        return f"{self.enrollment.student.username} - {self.content.title} - {'Completed' if self.completed else 'In Progress'}"
        
    def mark_as_completed(self):
        """Mark content as completed and record the time"""
        if not self.completed:
            self.completed = True
            self.completed_date = timezone.now()
            self.save()
            
            # Check if this completion affects overall course completion
            self.enrollment.check_completion_and_issue_certificate()

# Payments Model
class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    PAYMENT_METHODS = (
        ('stripe', 'Stripe'),
        # Add more methods as needed
    )
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'}, related_name='payments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='stripe')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.student.username} - {self.course.title} - {self.amount}"

# Assignments Model
class Assignment(models.Model):
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='assignments', null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    due_date = models.DateTimeField()
    total_points = models.IntegerField(default=100)
    passing_grade = models.IntegerField(default=60)  # Percentage needed to pass

    def __str__(self):
        return f"{self.title} - {self.course.title}"

# Assignment Submissions
class AssignmentSubmission(models.Model):
    STATUS_CHOICES = (
        ('submitted', 'Submitted'),
        ('graded', 'Graded'),
    )
    id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='submissions')
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    submission_date = models.DateTimeField(default=timezone.now)
    content = models.TextField()  # Text submission
    file = models.FileField(upload_to='submissions/', null=True, blank=True)  # File submission
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='submitted')
    feedback = models.TextField(null=True, blank=True)
    
    class Meta:
        unique_together = ('enrollment', 'assignment')
        
    def __str__(self):
        return f"{self.enrollment.student.username} - {self.assignment.title}"
        
    def grade_submission(self, grade, feedback=None):
        """Grade a submission and check for course completion"""
        self.grade = grade
        self.status = 'graded'
        if feedback:
            self.feedback = feedback
        self.save()
        
        # Check if this grading affects overall course completion
        self.enrollment.check_completion_and_issue_certificate()

# Certificates Model
class Certificate(models.Model):
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'}, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    issue_date = models.DateTimeField(default=timezone.now)
    verification_code = models.CharField(max_length=50, unique=True)

    class Meta:
        unique_together = ('student', 'course')  # One certificate per student per course

    def __str__(self):
        return f"{self.student.username} - {self.course.title} - {self.verification_code}"