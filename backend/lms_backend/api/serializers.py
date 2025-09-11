from rest_framework import serializers
from myapp.models import (
    User, Course, CourseModule, Content, Enrollment,
    ContentProgress, Payment, Assignment, AssignmentSubmission, Certificate,
    AssignmentQuestion, AssignmentOption, CourseRating
)
from django.db.models import Avg, Count

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
    # Virtual field used only for creation to position the new module
    after_module_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    class Meta:
        model = CourseModule
        fields = ['id', 'title', 'description', 'order', 'after_module_id']

    def create(self, validated_data):
        # Remove non-model field before creating instance
        validated_data.pop('after_module_id', None)
        return super().create(validated_data)

class ContentSerializer(serializers.ModelSerializer):
    # Virtual field to support "insert after" behavior (write-only)
    after_content_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    class Meta:
        model = Content
        fields = ['id', 'module', 'title', 'content_type', 'url', 'text', 'video', 'order', 'duration_minutes', 'after_content_id']

    def create(self, validated_data):
        # Remove non-model field before saving
        validated_data.pop('after_content_id', None)
        return super().create(validated_data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get('request') if hasattr(self, 'context') else None
        video_value = rep.get('video')
        # If DRF returned a relative media path, convert to absolute using request
        if video_value and request and isinstance(video_value, str) and video_value.startswith('/'):
            rep['video'] = request.build_absolute_uri(video_value)
        return rep

class AssignmentSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField(read_only=True)
    my_submission_status = serializers.SerializerMethodField(read_only=True)
    my_submission_grade = serializers.SerializerMethodField(read_only=True)
    attempts_used = serializers.SerializerMethodField(read_only=True)
    can_attempt = serializers.SerializerMethodField(read_only=True)
    my_best_grade = serializers.SerializerMethodField(read_only=True)
    passed = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Assignment
        fields = [
            'id', 'course', 'module', 'assignment_type', 'title', 'description',
            'total_points', 'passing_grade', 'max_attempts', 'questions',
            'my_submission_status', 'my_submission_grade',
            'attempts_used', 'can_attempt', 'my_best_grade', 'passed'
        ]
        read_only_fields = ['course']

    def get_questions(self, obj):
        qs = obj.questions.all()
        return AssignmentQuestionSerializer(qs, many=True).data

    def get_my_submission_status(self, obj):
        request = getattr(self, 'context', {}).get('request')
        if not request or not hasattr(request, 'user'):
            return None
        try:
            submission = obj.submissions.filter(enrollment__student=request.user).first()
            return submission.status if submission else None
        except Exception:
            return None

    def get_my_submission_grade(self, obj):
        request = getattr(self, 'context', {}).get('request')
        if not request or not hasattr(request, 'user'):
            return None
        try:
            submission = obj.submissions.filter(enrollment__student=request.user).first()
            return submission.grade if submission else None
        except Exception:
            return None

    def _my_submissions(self, obj, user):
        return obj.submissions.filter(enrollment__student=user)

    def get_attempts_used(self, obj):
        request = getattr(self, 'context', {}).get('request')
        if not request or not hasattr(request, 'user'):
            return 0
        return self._my_submissions(obj, request.user).count()

    def get_my_best_grade(self, obj):
        request = getattr(self, 'context', {}).get('request')
        if not request or not hasattr(request, 'user'):
            return None
        best = self._my_submissions(obj, request.user).filter(status='graded').order_by('-grade').first()
        return best.grade if best else None

    def get_passed(self, obj):
        best_grade = self.get_my_best_grade(obj)
        return bool(best_grade is not None and best_grade >= obj.passing_grade)

    def get_can_attempt(self, obj):
        request = getattr(self, 'context', {}).get('request')
        if not request or not hasattr(request, 'user'):
            return False
        subs = self._my_submissions(obj, request.user)
        used = subs.count()
        best = subs.filter(status='graded').order_by('-grade').first()
        already_passed = bool(best and best.grade is not None and best.grade >= obj.passing_grade)
        pending_qa = obj.assignment_type == 'qa' and subs.filter(status='submitted').exists()
        return (used < obj.max_attempts) and (not already_passed) and (not pending_qa)

class AssignmentOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentOption
        fields = ['id', 'text', 'is_correct', 'order']

class AssignmentQuestionSerializer(serializers.ModelSerializer):
    options = AssignmentOptionSerializer(many=True, required=False)
    class Meta:
        model = AssignmentQuestion
        fields = [
            'id', 'assignment', 'question_type', 'text', 'points', 'order',
            'explanation', 'keywords', 'required_keywords', 'negative_keywords', 'acceptable_answers',
            'options'
        ]

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = super().create(validated_data)
        for idx, opt in enumerate(options_data, start=1):
            # Avoid passing 'order' twice if it exists in opt
            opt_order = opt.pop('order', idx)
            AssignmentOption.objects.create(question=question, order=opt_order, **opt)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        instance = super().update(instance, validated_data)
        if options_data is not None:
            instance.options.all().delete()
            for idx, opt in enumerate(options_data, start=1):
                opt_order = opt.pop('order', idx)
                AssignmentOption.objects.create(question=instance, order=opt_order, **opt)
        return instance

class CourseListSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    enrollment_count = serializers.SerializerMethodField(read_only=True)
    # Compatibility alias so frontend can use course.status
    status = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    ratings_count = serializers.SerializerMethodField(read_only=True)
    my_rating = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'price', 'teacher', 'created_at', 'updated_at', 'is_published', 'published_at', 'publication_status', 'approval_note', 'status', 'enrollment_count', 'average_rating', 'ratings_count', 'my_rating']
        read_only_fields = ['teacher', 'created_at', 'updated_at', 'is_published', 'published_at', 'publication_status', 'approval_note', 'enrollment_count', 'average_rating', 'ratings_count', 'my_rating']

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()
    
    def get_status(self, obj):
        # Map new workflow field to legacy-compatible key used in frontend
        return getattr(obj, 'publication_status', 'draft')

    def _ratings_agg(self, obj):
        return obj.ratings.aggregate(avg=Avg('rating'), cnt=Count('id'))

    def get_average_rating(self, obj):
        data = self._ratings_agg(obj)
        avg = data.get('avg') or 0
        return round(float(avg), 1) if avg else 0

    def get_ratings_count(self, obj):
        data = self._ratings_agg(obj)
        return int(data.get('cnt') or 0)

    def get_my_rating(self, obj):
        request = getattr(self, 'context', {}).get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        try:
            cr = CourseRating.objects.filter(course=obj, student=user).first()
            return cr.rating if cr else None
        except Exception:
            return None

class CourseDetailSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    modules = CourseModuleSerializer(many=True, read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
    enrollment_count = serializers.SerializerMethodField(read_only=True)
    status = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    ratings_count = serializers.SerializerMethodField(read_only=True)
    my_rating = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'price', 'teacher', 'created_at', 'updated_at', 'is_published', 'published_at', 'publication_status', 'approval_note', 'status', 'modules', 'assignments', 'enrollment_count', 'average_rating', 'ratings_count', 'my_rating']
        read_only_fields = ['teacher', 'created_at', 'updated_at', 'is_published', 'published_at', 'publication_status', 'approval_note', 'modules', 'assignments', 'enrollment_count', 'average_rating', 'ratings_count', 'my_rating']

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()

    def get_status(self, obj):
        return getattr(obj, 'publication_status', 'draft')

    def _ratings_agg(self, obj):
        return obj.ratings.aggregate(avg=Avg('rating'), cnt=Count('id'))

    def get_average_rating(self, obj):
        data = self._ratings_agg(obj)
        avg = data.get('avg') or 0
        return round(float(avg), 1) if avg else 0

    def get_ratings_count(self, obj):
        data = self._ratings_agg(obj)
        return int(data.get('cnt') or 0)

    def get_my_rating(self, obj):
        request = getattr(self, 'context', {}).get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        try:
            cr = CourseRating.objects.filter(course=obj, student=user).first()
            return cr.rating if cr else None
        except Exception:
            return None

class CourseRatingSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    class Meta:
        model = CourseRating
        fields = ['id', 'course', 'student', 'rating', 'review', 'created_at', 'updated_at']
        read_only_fields = ['course', 'student', 'created_at', 'updated_at']

class ContentProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentProgress
        fields = ['id', 'enrollment', 'content', 'completed', 'completed_date', 'time_spent_seconds']
        read_only_fields = ['completed_date']

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'enrollment', 'assignment', 'submission_date', 'attempt_number', 'content', 'answers', 'file', 
                  'grade', 'status', 'feedback', 'student']
        read_only_fields = ['enrollment', 'assignment', 'submission_date', 'attempt_number', 'grade', 'status', 'feedback', 'student']

    def get_student(self, obj):
        try:
            return UserSerializer(obj.enrollment.student).data
        except Exception:
            return None

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