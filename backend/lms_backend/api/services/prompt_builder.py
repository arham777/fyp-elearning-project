from datetime import datetime
from pathlib import Path
from typing import Dict, List


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _read_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    return path.read_text(encoding="utf-8").strip()


class PromptBuilder:
    def __init__(self):
        self.base_identity = _read_prompt("base_identity.md")
        self.student_prompt = _read_prompt("student_system.md")
        self.teacher_prompt = _read_prompt("teacher_system.md")
        self.admin_prompt = _read_prompt("admin_system.md")
        self.guardrails = _read_prompt("policy_guardrails.md")

    def _role_prompt(self, role: str) -> str:
        if role == "admin":
            return self.admin_prompt
        if role == "teacher":
            return self.teacher_prompt
        return self.student_prompt

    @staticmethod
    def _format_user_context(role: str, user_context: Dict) -> str:
        """Format user context as a clean, labeled block instead of a raw dict."""
        lines = ["User profile:"]
        name = user_context.get("name") or user_context.get("username")
        if name:
            lines.append(f"- Name: {name}")
        lines.append(f"- Role: {role}")
        user_id = user_context.get("user_id")
        if user_id:
            lines.append(f"- User ID: {user_id}")
        email = user_context.get("email")
        if email:
            lines.append(f"- Email: {email}")

        # Student-specific fields
        if role == "student":
            for key, label in [
                ("preferred_category", "Preferred category"),
                ("skill_level", "Skill level"),
                ("learning_goal", "Learning goal"),
            ]:
                val = user_context.get(key)
                if val:
                    lines.append(f"- {label}: {val}")

            enrolled = user_context.get("enrolled_courses")
            if enrolled:
                lines.append(f"- Enrolled courses: {enrolled}")

        # Teacher-specific fields
        elif role == "teacher":
            courses_count = user_context.get("courses_count")
            if courses_count is not None:
                lines.append(f"- Courses created: {courses_count}")

        return "\n".join(lines)

    def build_system_prompt(
        self,
        role: str,
        user_context: Dict,
        capability_manifest: List[str],
        memory_context: str,
    ) -> str:
        current_date = datetime.now().strftime("%B %d, %Y")

        preferred_category = user_context.get("preferred_category") or "not set"
        skill_level = user_context.get("skill_level") or "not set"
        learning_goal = user_context.get("learning_goal") or "not set"

        role_prompt = self._role_prompt(role).format(
            preferred_category=preferred_category,
            skill_level=skill_level,
            learning_goal=learning_goal,
        )

        capability_text = "\n".join(f"- {item}" for item in capability_manifest) or "- No explicit tools"

        user_context_text = self._format_user_context(role, user_context)

        sections = [
            self.base_identity.format(
                capability_manifest=capability_text,
                current_date=current_date,
            ),
            role_prompt,
            self.guardrails,
            user_context_text,
            f"Conversation memory (recent turns):\n{memory_context or 'No prior turns'}",
            "Response contract: Provide the final answer directly to the user in clear Markdown. "
            "Address the user by name when appropriate for a personal touch.",
        ]
        return "\n\n".join(sections)

