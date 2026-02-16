from dataclasses import dataclass
from typing import Callable, Dict, List

from .postgres_functions import PostgreSQLFunctions


@dataclass
class ChatTool:
    name: str
    description: str
    roles: List[str]
    fn: Callable[..., object]


def build_tool_registry(db: PostgreSQLFunctions) -> Dict[str, ChatTool]:
    return {
        "get_courses_by_filters": ChatTool(
            name="get_courses_by_filters",
            description="Filter published courses by category, difficulty, rating, and budget.",
            roles=["student", "teacher", "admin"],
            fn=db.get_courses_by_filters,
        ),
        "get_top_courses_by_rating": ChatTool(
            name="get_top_courses_by_rating",
            description="Fetch top-rated courses with a minimum reviews threshold.",
            roles=["student", "teacher", "admin"],
            fn=db.get_top_courses_by_rating,
        ),
        "get_courses_by_goal": ChatTool(
            name="get_courses_by_goal",
            description="Recommend courses based on learning goal, level, and budget.",
            roles=["student", "teacher", "admin"],
            fn=db.get_courses_by_goal,
        ),
        "get_student_progress_summary": ChatTool(
            name="get_student_progress_summary",
            description="Summarize a student's course progress and completion status.",
            roles=["student"],
            fn=db.get_student_progress_summary,
        ),
        "get_teacher_course_performance": ChatTool(
            name="get_teacher_course_performance",
            description="Summarize teacher-owned course performance and engagement metrics.",
            roles=["teacher"],
            fn=db.get_teacher_course_performance,
        ),
        "get_admin_progress_leaderboard": ChatTool(
            name="get_admin_progress_leaderboard",
            description="Fetch student progress leaderboard for admin analytics.",
            roles=["admin"],
            fn=db.get_admin_progress_leaderboard,
        ),
        "get_admin_course_risk_report": ChatTool(
            name="get_admin_course_risk_report",
            description="Report high-risk courses based on low completion/ratings.",
            roles=["admin"],
            fn=db.get_admin_course_risk_report,
        ),
        "get_platform_snapshot": ChatTool(
            name="get_platform_snapshot",
            description="Get top-level platform usage totals for admins.",
            roles=["admin"],
            fn=db.get_platform_snapshot,
        ),
    }

