import json
import os
import re
from typing import Dict, Generator, List, Optional, Tuple
from openai import OpenAI

from .postgres_functions import PostgreSQLFunctions
from .prompt_builder import PromptBuilder
from .tool_registry import ChatTool, build_tool_registry


class ChatbotConfigurationError(RuntimeError):
    pass


class CerebrasChatbotService:
    """Role-aware chatbot service with tool routing, memory, and streaming."""

    def __init__(self):
        self.model_name = os.getenv("CEREBRAS_MODEL", "zai-glm-4.7")
        self.api_key = (
            os.getenv("CEREBRAS_API_KEY", "").strip()
            or os.getenv("CEREBRAS_ROUTER_API_KEY", "").strip()
            or os.getenv("CEREBRAS_ROUTER_KEY", "").strip()
            or os.getenv("CEREBRAS_KEY", "").strip()
        )
        self.base_url = os.getenv("CEREBRAS_BASE_URL", "https://api.cerebras.ai/v1").strip()
        self.temperature = float(os.getenv("CHATBOT_TEMPERATURE", "1.0"))
        self.top_p = float(os.getenv("CHATBOT_TOP_P", "0.95"))
        self.max_completion_tokens = int(os.getenv("CHATBOT_MAX_COMPLETION_TOKENS", "128000"))
        if not self.api_key:
            raise ChatbotConfigurationError(
                "Cerebras API key is not configured. Set one of: "
                "CEREBRAS_API_KEY, CEREBRAS_ROUTER_API_KEY, CEREBRAS_ROUTER_KEY, CEREBRAS_KEY."
            )
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        self.db = PostgreSQLFunctions()
        self.prompt_builder = PromptBuilder()
        self.registry = build_tool_registry(self.db)

    @staticmethod
    def _token_estimate(text: str) -> int:
        # Lightweight estimate for reporting only.
        return max(1, len((text or "").split()))

    @staticmethod
    def _compact_memory(memory_messages: List[Dict], limit: int = 10) -> str:
        recent = memory_messages[-max(0, limit):]
        lines: List[str] = []
        for item in recent:
            user_text = (item.get("query") or "").replace("\n", " ").strip()
            assistant_text = (item.get("response") or "").replace("\n", " ").strip()
            if user_text:
                lines.append(f"User: {user_text[:260]}")
            if assistant_text:
                lines.append(f"Assistant: {assistant_text[:260]}")
        return "\n".join(lines)

    def _capability_manifest(self, role: str) -> List[str]:
        items = []
        for tool in self.registry.values():
            if role in tool.roles:
                items.append(f"{tool.name}: {tool.description}")
        items.append(
            "get_learning_roadmap: synthesize a practical study roadmap for a requested topic and level."
        )
        return items

    def _extract_course_filters(self, query: str) -> Dict:
        q = query.lower()
        difficulty = None
        if any(t in q for t in ["beginner", "easy"]):
            difficulty = "easy"
        elif any(t in q for t in ["intermediate", "medium"]):
            difficulty = "medium"
        elif any(t in q for t in ["advanced", "hard"]):
            difficulty = "hard"

        max_price = None
        price_match = re.search(r"(?:under|below|less than)\s*\$?\s*(\d+(?:\.\d+)?)", q)
        if price_match:
            max_price = float(price_match.group(1))

        min_rating = None
        rating_match = re.search(r"(?:rating|rated)\s*(?:above|over|>=|at least)?\s*(\d(?:\.\d)?)", q)
        if rating_match:
            min_rating = float(rating_match.group(1))

        category = None
        category_match = re.search(
            r"(python|javascript|web|data science|ai|machine learning|design|marketing|devops|english|business)",
            q,
        )
        if category_match:
            category = category_match.group(1)
        return {
            "category": category,
            "difficulty": difficulty,
            "min_rating": min_rating,
            "max_price": max_price,
        }

    @staticmethod
    def _extract_goal(query: str) -> Optional[str]:
        q = query.strip()
        if not q:
            return None
        match = re.search(r"(?:learn|master|roadmap for|goal)\s+(.+)", q, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()[:80]
        return None

    def _available_tools(self, role: str) -> Dict[str, ChatTool]:
        return {name: tool for name, tool in self.registry.items() if role in tool.roles}

    def _call_tool(
        self,
        available_tools: Dict[str, ChatTool],
        tool_name: str,
        args: Dict,
        context_data: Dict,
        function_calls: List[Dict],
    ) -> None:
        tool = available_tools.get(tool_name)
        if not tool:
            return
        result = tool.fn(**args)
        context_data[tool_name] = result
        function_calls.append({"name": tool_name, "args": args})

    def _route_tools(
        self,
        query: str,
        role: str,
        user_context: Dict,
    ) -> Tuple[Dict, List[Dict], List[Dict]]:
        q = query.lower()
        context_data: Dict = {}
        function_calls: List[Dict] = []
        reasoning_trace: List[Dict] = []
        available_tools = self._available_tools(role)

        reasoning_trace.append({"stage": "intent", "text": "Parsed request intent and selected relevant tools."})

        if any(token in q for token in ["best", "top", "rating", "highest rated"]):
            self._call_tool(
                available_tools,
                "get_top_courses_by_rating",
                {"limit": 8, "min_reviews": 1},
                context_data,
                function_calls,
            )

        if any(token in q for token in ["course", "recommend", "suggest", "catalog", "find", "search"]):
            filters = self._extract_course_filters(query)
            args = {k: v for k, v in filters.items() if v is not None}
            args.setdefault("limit", 8)
            self._call_tool(
                available_tools,
                "get_courses_by_filters",
                args,
                context_data,
                function_calls,
            )

        if any(token in q for token in ["goal", "roadmap", "learn", "master"]):
            goal = self._extract_goal(query) or query[:80]
            self._call_tool(
                available_tools,
                "get_courses_by_goal",
                {
                    "goal": goal,
                    "skill_level": user_context.get("skill_level"),
                    "budget": None,
                    "limit": 6,
                },
                context_data,
                function_calls,
            )

        user_id = int(user_context.get("user_id"))
        if role == "student" and any(
            token in q for token in ["my progress", "my course", "my enroll", "completion"]
        ):
            self._call_tool(
                available_tools,
                "get_student_progress_summary",
                {"user_id": user_id},
                context_data,
                function_calls,
            )
        elif role == "teacher" and any(
            token in q for token in ["my course", "my class", "my students", "performance", "enrollment"]
        ):
            self._call_tool(
                available_tools,
                "get_teacher_course_performance",
                {"teacher_id": user_id},
                context_data,
                function_calls,
            )
        elif role == "admin":
            if any(token in q for token in [
                "platform", "overview", "dashboard", "snapshot", "stats",
                "total", "how many", "count", "number of",
                "students", "teachers", "users", "enrollments",
                "courses",
            ]):
                self._call_tool(
                    available_tools,
                    "get_platform_snapshot",
                    {},
                    context_data,
                    function_calls,
                )
            if any(token in q for token in ["top students", "leaderboard", "progressive"]):
                self._call_tool(
                    available_tools,
                    "get_admin_progress_leaderboard",
                    {"limit": 10},
                    context_data,
                    function_calls,
                )
            if any(token in q for token in ["risk", "drop", "low completion", "underperforming"]):
                self._call_tool(
                    available_tools,
                    "get_admin_course_risk_report",
                    {"limit": 10, "min_enrollments": 2},
                    context_data,
                    function_calls,
                )

        if function_calls:
            reasoning_trace.append(
                {
                    "stage": "tooling",
                    "text": f"Fetched tool-backed context from {len(function_calls)} data source(s).",
                }
            )
        else:
            reasoning_trace.append(
                {"stage": "tooling", "text": "No direct platform tool data required for this query."}
            )
        return context_data, function_calls, reasoning_trace

    @staticmethod
    def _learning_roadmap(topic: str, level: str = "beginner", duration_weeks: int = 8) -> Dict:
        weeks = max(2, min(int(duration_weeks or 8), 24))
        milestones = []
        phases = [
            "Foundations and terminology",
            "Core concepts with guided practice",
            "Applied mini-projects",
            "Advanced practice and portfolio-ready work",
        ]
        for index in range(4):
            start_week = int((weeks / 4) * index) + 1
            end_week = int((weeks / 4) * (index + 1))
            milestones.append(
                {
                    "phase": phases[index],
                    "timeline": f"Week {start_week} to {max(start_week, end_week)}",
                    "focus": f"{topic} - {phases[index].lower()}",
                }
            )
        return {
            "topic": topic,
            "level": level,
            "duration_weeks": weeks,
            "milestones": milestones,
            "study_pattern": "5 focused sessions/week, 60-90 minutes each",
        }

    def _build_system_prompt(
        self,
        role: str,
        user_context: Dict,
        memory_messages: List[Dict],
    ) -> str:
        capability_manifest = self._capability_manifest(role)
        memory_context = self._compact_memory(memory_messages, limit=10)
        return self.prompt_builder.build_system_prompt(
            role=role,
            user_context=user_context,
            capability_manifest=capability_manifest,
            memory_context=memory_context,
        )

    def _build_prompt_payload(
        self,
        query: str,
        role: str,
        user_context: Dict,
        memory_messages: List[Dict],
    ) -> Tuple[str, Dict, List[Dict], List[Dict], str]:
        context_data, function_calls, reasoning_trace = self._route_tools(
            query=query, role=role, user_context=user_context
        )
        if any(token in query.lower() for token in ["roadmap", "master", "workflow", "how to learn"]):
            topic = self._extract_goal(query) or query[:80]
            roadmap = self._learning_roadmap(
                topic=topic,
                level=str(user_context.get("skill_level") or "beginner"),
                duration_weeks=8,
            )
            context_data["get_learning_roadmap"] = roadmap
            function_calls.append(
                {
                    "name": "get_learning_roadmap",
                    "args": {
                        "topic": topic,
                        "level": str(user_context.get("skill_level") or "beginner"),
                        "duration_weeks": 8,
                    },
                }
            )

        system_prompt = self._build_system_prompt(
            role=role,
            user_context=user_context,
            memory_messages=memory_messages,
        )
        payload = (
            f"User query:\n{query}\n\n"
            f"Tool/context data:\n{json.dumps(context_data, ensure_ascii=True)}\n\n"
            "If asked who you are or what you can do, explain capabilities from capability manifest naturally. "
            "Provide concise, accurate, role-aware guidance. "
            "IMPORTANT: When mentioning a specific course or listing courses in a table, ALWAYS format the course title as a markdown link using its ID: `[Course Title](/app/courses/<id>)`."
        )
        reasoning_trace.append({"stage": "synthesis", "text": "Synthesizing final answer from context and role policy."})
        return system_prompt, context_data, function_calls, reasoning_trace + [
            {"stage": "prompt", "text": "Final prompt prepared for model generation."}
        ], payload



    def chat(
        self,
        query: str,
        role: str,
        user_context: Dict,
        memory_messages: Optional[List[Dict]] = None,
        show_reasoning: bool = True,
    ) -> Dict:
        memory_messages = memory_messages or []
        (
            system_prompt,
            context_data,
            function_calls,
            reasoning_trace,
            payload,
        ) = self._build_prompt_payload(
            query=query,
            role=role,
            user_context=user_context,
            memory_messages=memory_messages,
        )
        extra_body = {}
        if self.model_name == "zai-glm-4.7":
            extra_body["disable_reasoning"] = not show_reasoning
            extra_body["clear_thinking"] = False
        elif self.model_name == "gpt-oss-120b":
            if not show_reasoning:
                extra_body["reasoning_format"] = "hidden"

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": payload},
                ],
                stream=False,
                max_completion_tokens=self.max_completion_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                extra_body=extra_body if extra_body else None,
            )
            text = ((response.choices[0].message.content if response.choices else None) or "").strip()
            if show_reasoning and response.choices:
                reasoning_text = getattr(response.choices[0].message, "reasoning", None)
                if reasoning_text:
                    reasoning_trace.append({"stage": "thinking", "text": reasoning_text})
            if not text:
                raise RuntimeError("Model returned empty content.")
            source = "cerebras"
            warning = None
        except Exception as exc:
            msg = str(exc)
            if "quota" in msg.lower() or "rate" in msg.lower() or "429" in msg:
                raise RuntimeError("Cerebras quota exceeded. Please try again later.") from exc
            else:
                raise RuntimeError(f"Cerebras request failed: {exc}") from exc

        return {
            "response": text,
            "function_calls": function_calls,
            "reasoning_trace": reasoning_trace if show_reasoning else [],
            "source": source,
            "warning": warning,
            "model_name": self.model_name,
            "token_count_input": self._token_estimate(payload),
            "token_count_output": self._token_estimate(text),
        }

    def chat_stream(
        self,
        query: str,
        role: str,
        user_context: Dict,
        memory_messages: Optional[List[Dict]] = None,
        show_reasoning: bool = True,
    ) -> Generator[Dict, None, None]:
        memory_messages = memory_messages or []
        (
            system_prompt,
            context_data,
            function_calls,
            reasoning_trace,
            payload,
        ) = self._build_prompt_payload(
            query=query,
            role=role,
            user_context=user_context,
            memory_messages=memory_messages,
        )
        if show_reasoning:
            for step in reasoning_trace:
                yield {"event": "reasoning", "data": step}
        for call in function_calls:
            yield {"event": "tool_call", "data": call}

        full_text = ""
        full_reasoning = ""
        source = "cerebras"
        warning = None
        
        extra_body = {}
        if self.model_name == "zai-glm-4.7":
            extra_body["disable_reasoning"] = not show_reasoning
            extra_body["clear_thinking"] = False
        elif self.model_name == "gpt-oss-120b":
            if not show_reasoning:
                extra_body["reasoning_format"] = "hidden"

        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": payload},
                ],
                stream=True,
                max_completion_tokens=self.max_completion_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                extra_body=extra_body if extra_body else None,
            )
            for chunk in stream:
                choices = getattr(chunk, "choices", None) or []
                if not choices:
                    continue
                delta = getattr(choices[0], "delta", None)
                if delta is None:
                    continue
                
                # Check for reasoning tokens
                reasoning_text = getattr(delta, "reasoning", None)
                if reasoning_text and show_reasoning:
                    full_reasoning += reasoning_text
                    yield {"event": "reasoning_token", "data": {"text": reasoning_text}}
                
                # Check for content tokens
                chunk_text = getattr(delta, "content", None)
                if chunk_text:
                    full_text += chunk_text
                    yield {"event": "token", "data": {"text": chunk_text}}
            if not full_text.strip():
                raise RuntimeError("Model returned empty content.")
        except Exception as exc:
            msg = str(exc)
            if "quota" in msg.lower() or "rate" in msg.lower() or "429" in msg:
                raise RuntimeError("Cerebras quota exceeded. Please try again later.") from exc
            else:
                raise RuntimeError(f"Cerebras stream failed: {exc}") from exc

        if full_reasoning and show_reasoning:
            reasoning_trace.append({"stage": "thinking", "text": full_reasoning})

        yield {
            "event": "done",
            "data": {
                "function_calls": function_calls,
                "source": source,
                "warning": warning,
                "response": full_text.strip(),
                "reasoning_trace": reasoning_trace if show_reasoning else [],
                "model_name": self.model_name,
                "token_count_input": self._token_estimate(payload),
                "token_count_output": self._token_estimate(full_text),
            },
        }

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 40) -> List[str]:
        value = text or ""
        return [value[i:i + chunk_size] for i in range(0, len(value), chunk_size)] or [""]


# Backward-compatible alias for existing imports.
GeminiChatbotService = CerebrasChatbotService
