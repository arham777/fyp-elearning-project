from typing import Dict, List, Optional

from django.db.models import Avg, Count, Q

from myapp.models import Course, Enrollment, User


class PostgreSQLFunctions:
    """Database tools used by the chatbot agent."""

    @staticmethod
    def _published_courses_queryset():
        return Course.objects.filter(
            Q(is_published=True) | Q(publication_status="published")
        ).select_related("teacher")

    @staticmethod
    def get_courses_by_filters(
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 8,
    ) -> List[Dict]:
        courses = PostgreSQLFunctions._published_courses_queryset()
        if category:
            courses = courses.filter(category__icontains=category.strip())
        if difficulty:
            courses = courses.filter(difficulty_level=difficulty.strip().lower())
        if max_price is not None:
            courses = courses.filter(price__lte=max_price)

        courses = courses.annotate(
            average_rating=Avg("ratings__rating"),
            ratings_count=Count("ratings"),
            enrollment_count=Count("enrollments"),
        ).order_by("-average_rating", "-ratings_count", "-enrollment_count")

        result: List[Dict] = []
        for course in courses[: max(1, min(int(limit), 20))]:
            avg_rating = float(course.average_rating or 0.0)
            if min_rating is not None and avg_rating < float(min_rating):
                continue
            teacher = course.teacher
            teacher_name = (
                f"{teacher.first_name} {teacher.last_name}".strip() or teacher.username
                if teacher
                else "Unknown"
            )
            result.append(
                {
                    "id": course.id,
                    "title": course.title,
                    "category": course.category or "Uncategorized",
                    "difficulty": course.difficulty_level,
                    "price": float(course.price or 0),
                    "rating": round(avg_rating, 2),
                    "ratings_count": int(course.ratings_count or 0),
                    "enrollments": int(course.enrollment_count or 0),
                    "teacher": teacher_name,
                    "description": (course.description or "")[:220],
                }
            )
        return result

    @staticmethod
    def get_top_courses_by_rating(limit: int = 10, min_reviews: int = 1) -> List[Dict]:
        courses = (
            PostgreSQLFunctions._published_courses_queryset()
            .annotate(
                average_rating=Avg("ratings__rating"),
                ratings_count=Count("ratings"),
                enrollment_count=Count("enrollments"),
            )
            .filter(ratings_count__gte=max(0, int(min_reviews)))
            .order_by("-average_rating", "-ratings_count", "-enrollment_count")[
                : max(1, min(int(limit), 30))
            ]
        )
        return [
            {
                "id": c.id,
                "title": c.title,
                "category": c.category or "Uncategorized",
                "difficulty": c.difficulty_level,
                "price": float(c.price or 0),
                "rating": round(float(c.average_rating or 0), 2),
                "ratings_count": int(c.ratings_count or 0),
                "enrollments": int(c.enrollment_count or 0),
            }
            for c in courses
        ]

    @staticmethod
    def get_courses_by_goal(
        goal: Optional[str] = None,
        skill_level: Optional[str] = None,
        budget: Optional[float] = None,
        limit: int = 10,
    ) -> List[Dict]:
        courses = PostgreSQLFunctions._published_courses_queryset()
        if budget is not None:
            courses = courses.filter(price__lte=budget)
        if skill_level:
            norm = str(skill_level).strip().lower()
            level_map = {
                "beginner": "easy",
                "intermediate": "medium",
                "advanced": "hard",
                "easy": "easy",
                "medium": "medium",
                "hard": "hard",
            }
            mapped = level_map.get(norm)
            if mapped:
                courses = courses.filter(difficulty_level=mapped)
        if goal:
            goal_text = str(goal).strip().lower()
            courses = courses.filter(
                Q(title__icontains=goal_text)
                | Q(description__icontains=goal_text)
                | Q(category__icontains=goal_text)
            )

        courses = courses.annotate(
            average_rating=Avg("ratings__rating"),
            enrollment_count=Count("enrollments"),
        ).order_by("-average_rating", "-enrollment_count", "-created_at")[
            : max(1, min(int(limit), 20))
        ]
        return [
            {
                "id": c.id,
                "title": c.title,
                "difficulty": c.difficulty_level,
                "price": float(c.price or 0),
                "rating": round(float(c.average_rating or 0), 2),
                "enrollments": int(c.enrollment_count or 0),
            }
            for c in courses
        ]

    @staticmethod
    def get_my_enrollments(user_id: int) -> List[Dict]:
        enrollments = (
            Enrollment.objects.filter(student_id=user_id)
            .select_related("course")
            .order_by("-enrollment_date")
        )
        rows: List[Dict] = []
        for enrollment in enrollments:
            try:
                progress = float(enrollment.calculate_progress())
            except Exception:
                progress = 0.0
            rows.append(
                {
                    "course_id": enrollment.course_id,
                    "course": enrollment.course.title,
                    "status": enrollment.status,
                    "progress": progress,
                    "enrolled_at": enrollment.enrollment_date.isoformat(),
                }
            )
        return rows

    @staticmethod
    def get_student_progress_summary(user_id: int) -> Dict:
        my_enrollments = PostgreSQLFunctions.get_my_enrollments(user_id)
        total = len(my_enrollments)
        if total == 0:
            return {
                "total_courses": 0,
                "average_progress": 0.0,
                "completed_courses": 0,
                "active_courses": 0,
                "needs_attention": [],
            }
        avg_progress = round(sum(float(e["progress"]) for e in my_enrollments) / total, 2)
        completed = sum(1 for e in my_enrollments if e["status"] == "completed")
        active = total - completed
        needs_attention = [e for e in my_enrollments if float(e["progress"]) < 40.0][:5]
        return {
            "total_courses": total,
            "average_progress": avg_progress,
            "completed_courses": completed,
            "active_courses": active,
            "needs_attention": needs_attention,
        }

    @staticmethod
    def get_teacher_courses(teacher_id: int) -> List[Dict]:
        courses = (
            Course.objects.filter(teacher_id=teacher_id)
            .annotate(
                enrollment_count=Count("enrollments"),
                average_rating=Avg("ratings__rating"),
                completed_count=Count(
                    "enrollments", filter=Q(enrollments__status="completed")
                ),
            )
            .order_by("-created_at")
        )
        results: List[Dict] = []
        for c in courses:
            enrollments = int(c.enrollment_count or 0)
            completed = int(c.completed_count or 0)
            completion_rate = round((completed / enrollments) * 100, 2) if enrollments else 0.0
            results.append(
                {
                    "id": c.id,
                    "title": c.title,
                    "published": bool(c.is_published or c.publication_status == "published"),
                    "publication_status": c.publication_status,
                    "enrollments": enrollments,
                    "rating": round(float(c.average_rating or 0.0), 2),
                    "completion_rate": completion_rate,
                }
            )
        return results

    @staticmethod
    def get_teacher_course_performance(teacher_id: int) -> Dict:
        courses = PostgreSQLFunctions.get_teacher_courses(teacher_id)
        if not courses:
            return {
                "total_courses": 0,
                "published_courses": 0,
                "total_enrollments": 0,
                "average_rating": 0.0,
                "average_completion_rate": 0.0,
                "top_courses": [],
                "underperforming_courses": [],
            }
        total_courses = len(courses)
        published_courses = sum(1 for c in courses if c["published"])
        total_enrollments = sum(int(c["enrollments"]) for c in courses)
        average_rating = round(
            sum(float(c["rating"]) for c in courses) / max(total_courses, 1), 2
        )
        average_completion_rate = round(
            sum(float(c["completion_rate"]) for c in courses) / max(total_courses, 1), 2
        )
        top_courses = sorted(
            courses, key=lambda c: (float(c["rating"]), int(c["enrollments"])), reverse=True
        )[:5]
        underperforming = [
            c
            for c in courses
            if float(c["rating"]) < 3.0 or float(c["completion_rate"]) < 35.0
        ][:5]
        return {
            "total_courses": total_courses,
            "published_courses": published_courses,
            "total_enrollments": total_enrollments,
            "average_rating": average_rating,
            "average_completion_rate": average_completion_rate,
            "top_courses": top_courses,
            "underperforming_courses": underperforming,
        }

    @staticmethod
    def get_admin_progress_leaderboard(limit: int = 10) -> List[Dict]:
        students = User.objects.filter(role="student").order_by("id")[:300]
        rows: List[Dict] = []
        for student in students:
            enrollments = Enrollment.objects.filter(student=student).select_related("course")
            if not enrollments:
                continue
            progress_values = []
            completed = 0
            for enrollment in enrollments:
                try:
                    p = float(enrollment.calculate_progress())
                except Exception:
                    p = 0.0
                progress_values.append(p)
                if enrollment.status == "completed":
                    completed += 1
            avg_progress = round(sum(progress_values) / max(len(progress_values), 1), 2)
            rows.append(
                {
                    "student_id": student.id,
                    "username": student.username,
                    "courses_count": len(progress_values),
                    "completed_courses": completed,
                    "average_progress": avg_progress,
                }
            )
        rows.sort(
            key=lambda r: (float(r["average_progress"]), int(r["completed_courses"])),
            reverse=True,
        )
        return rows[: max(1, min(int(limit), 50))]

    @staticmethod
    def get_admin_course_risk_report(
        limit: int = 10, min_enrollments: int = 3
    ) -> List[Dict]:
        courses = (
            PostgreSQLFunctions._published_courses_queryset()
            .annotate(
                enrollment_count=Count("enrollments"),
                completed_count=Count(
                    "enrollments", filter=Q(enrollments__status="completed")
                ),
                average_rating=Avg("ratings__rating"),
            )
            .filter(enrollment_count__gte=max(0, int(min_enrollments)))
        )
        rows: List[Dict] = []
        for c in courses:
            enrollments = int(c.enrollment_count or 0)
            completed = int(c.completed_count or 0)
            completion_rate = round((completed / enrollments) * 100, 2) if enrollments else 0.0
            avg_rating = round(float(c.average_rating or 0.0), 2)
            risk_score = round(
                max(0.0, (100 - completion_rate) * 0.6 + max(0.0, 5 - avg_rating) * 8),
                2,
            )
            rows.append(
                {
                    "course_id": c.id,
                    "title": c.title,
                    "enrollments": enrollments,
                    "completion_rate": completion_rate,
                    "rating": avg_rating,
                    "risk_score": risk_score,
                }
            )
        rows.sort(key=lambda r: float(r["risk_score"]), reverse=True)
        return rows[: max(1, min(int(limit), 30))]

    @staticmethod
    def get_platform_snapshot() -> Dict:
        return {
            "total_users": User.objects.count(),
            "total_students": User.objects.filter(role="student").count(),
            "total_teachers": User.objects.filter(role="teacher").count(),
            "total_courses": Course.objects.count(),
            "published_courses": PostgreSQLFunctions._published_courses_queryset().count(),
            "total_enrollments": Enrollment.objects.count(),
        }

