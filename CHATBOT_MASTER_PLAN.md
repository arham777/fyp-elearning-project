# 🤖 AI Chatbot Master Plan: The Single Source of Truth

**Objective:** Implement a role-based AI chatbot using **Google Gemini API** and **PostgreSQL**.
**Architecture:** Frontend (Vercel) → Backend (Render/Django) → Gemini API ↔ PostgreSQL Function Calling.
**Cost:** ~$0 - $1.13/month.

---

## 📋 1. Prerequisites & Environment

### A. Get Gemini API Key (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key.

### B. Environment Variables
Add these to your **backend** `.env` file (and later to Render dashboard):
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-pro-preview
```
*(Ensure your `DATABASE_URL` is already set for PostgreSQL)*

### C. Install Dependencies
Run in your `backend/` directory:
```bash
pip install google-generativeai==0.8.3
pip freeze > requirements.txt
```

---

## ⚙️ 2. Backend Implementation (Django)

### Step 2.1: Chat History Model
Create file: `backend/lms_backend/myapp/chatbot_models.py`

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

**Action:** Import this model in `backend/lms_backend/myapp/models.py`:
```python
from .chatbot_models import ChatMessage
```

**Action:** Run Migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 2.2: PostgreSQL Functions Service
Create file: `backend/lms_backend/api/services/postgres_functions.py`

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
        """retrieve courses with filters (category, difficulty, rating, price)"""
        courses = Course.objects.filter(status='approved')
        if category: courses = courses.filter(category__icontains=category)
        if difficulty: courses = courses.filter(difficulty_level=difficulty.lower())
        if max_price: courses = courses.filter(price__lte=max_price)
        courses = courses[:limit]
        
        results = []
        for course in courses:
            ratings = course.ratings.all()
            avg_rating = ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0
            if min_rating and avg_rating < min_rating: continue
            
            results.append({
                'id': course.id,
                'title': course.title,
                'category': course.category or 'Uncategorized',
                'description': course.description[:200],
                'difficulty': course.difficulty_level,
                'instructor': course.instructor.get_full_name() if course.instructor else 'Unknown',
                'price': float(course.price) if course.price else 0.0,
                'rating': round(avg_rating, 2),
                'enrollments': course.enrollments.count()
            })
        return results

    @staticmethod
    def get_my_enrollments(user_id: int) -> List[Dict]:
        """Get the requesting user's enrolled courses and progress"""
        try:
            student = User.objects.get(id=user_id)
            enrollments = student.enrollments.all()
            return [{
                'course': e.course.title,
                'status': e.status,
                'progress': e.calculate_progress() if hasattr(e, 'calculate_progress') else 0,
                'enrolled_at': e.enrolled_at.isoformat()
            } for e in enrollments]
        except User.DoesNotExist:
            return []

    # Add other functions (get_course_details, get_instructor_info, etc.) similarly
    # For brevity, these are the core essential ones. 
    # Use the logic from the previous spec for full list if needed.
```

### Step 2.3: Gemini Service
Create file: `backend/lms_backend/api/services/gemini_service.py`

```python
import google.generativeai as genai
import os
from typing import List, Dict
from .postgres_functions import PostgreSQLFunctions

class GeminiChatbotService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key: raise ValueError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)
        self.model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        self.db = PostgreSQLFunctions()
    
    def chat(self, query: str, role: str, user_context: Dict) -> Dict:
        user_id = user_context.get('user_id')
        
        # Define tools based on Logic
        tools = [self.db.get_courses_by_filters] # Add all functions here
        
        # Custom wrapper for 'my' data to inject user_id safely
        def get_my_data():
            return self.db.get_my_enrollments(user_id)
            
        if role == 'student':
            tools.append(get_my_data)

        # System Prompt
        sys_prompt = f"""You are an AI assistant for {role}s on an e-learning platform.
        User Context: {user_context}
        Rules:
        1. Use available tools to fetch data.
        2. Never hallucinate data.
        3. Be concierge-like and helpful.
        """

        model = genai.GenerativeModel(
            model_name=self.model_name,
            tools=tools,
            system_instruction=sys_prompt
        )
        
        chat = model.start_chat(enable_automatic_function_calling=True)
        response = chat.send_message(query)
        
        # Extract function calls for logging
        fn_calls = []
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'function_call'):
                fn_calls.append({'name': part.function_call.name, 'args': dict(part.function_call.args)})

        return {'response': response.text, 'function_calls': fn_calls}
```

### Step 2.4: API Views
Update `backend/lms_backend/api/views.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from myapp.chatbot_models import ChatMessage
from .services.gemini_service import GeminiChatbotService
import time

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_query(request):
    query = request.data.get('query', '')
    if not query: return Response({'error': 'No query provided'}, status=400)
    
    start = time.time()
    try:
        service = GeminiChatbotService()
        user_context = {'user_id': request.user.id, 'name': request.user.get_full_name()}
        
        result = service.chat(query, request.user.role, user_context)
        
        # Log to DB
        ChatMessage.objects.create(
            user=request.user,
            role=request.user.role,
            query=query,
            response=result['response'],
            function_calls=result['function_calls'],
            response_time_ms=int((time.time() - start) * 1000)
        )
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
```

**Action:** Add URL to `backend/lms_backend/api/urls.py`:
```python
path('chatbot/query/', views.chatbot_query, name='chatbot_query'),
```

---

## 💻 3. Frontend Implementation (React)

### Step 3.1: API Client
Create `e-learning-ui/src/api/chatbot.ts`:

```typescript
import apiClient from './apiClient';

export const chatbotApi = {
  sendQuery: async (query: string) => {
    const { data } = await apiClient.post('/api/chatbot/query/', { query });
    return data;
  }
};
```

### Step 3.2: Chat Widget
Create `e-learning-ui/src/components/chatbot/ChatWidget.tsx`:

```typescript
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatbotApi } from '@/api/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  const mutation = useMutation({
    mutationFn: chatbotApi.sendQuery,
    onSuccess: (data) => {
      setMessages(prev => [...prev, { type: 'bot', text: data.response }]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { type: 'user', text: input }]);
    mutation.mutate(input);
    setInput('');
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-xl">
        <MessageSquare />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white border rounded-xl shadow-2xl flex flex-col z-50">
      <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center rounded-t-xl">
        <h3 className="font-bold">AI Assistant</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${m.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {mutation.isPending && <Loader2 className="animate-spin h-4 w-4" />}
      </div>

      <div className="p-4 border-t flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about courses..." 
        />
        <Button onClick={handleSend} disabled={mutation.isPending}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};
```

### Step 3.3: Integration
Add `<ChatWidget />` to your `App.tsx` layout.

---

## 🚀 4. Usage & Deployment

1.  **Run Development**:
    *   Backend: `python manage.py runserver`
    *   Frontend: `npm run dev`

2.  **Deployment (Render/Vercel)**:
    *   Push code to git.
    *   **Render**: Add `GEMINI_API_KEY` to Environment Variables. Ensure `pip install google-generativeai` runs during build.
    *   **Vercel**: No changes needed (Frontend just hits the API).

3.  **Testing**:
    *   Login as Student.
    *   Ask: *"What courses am I enrolled in?"* -> Should check DB.
    *   Ask: *"Show me python courses"* -> Should filter DB.

---
**This is the only file you need to follow.**
