# Project Plan: AI-Assisted Course Content Generation (Phase 1)

**Version:** 1.0  
**Date:** February 2026  
**Focus:** Reading Content Generation (Video Content Deferred)

---

## 1. Executive Summary
The goal of this feature is to reduce the workload for teachers on our platform by integrating AI tools directly into the course creation workflow. 

In **Phase 1**, we will focus exclusively on **Text/Reading Modules**. Teachers will be able to input a simple topic (e.g., "Introduction to Python Variables"), and the AI will generate a structured, formatted educational lesson which the teacher can review and edit before publishing.

## 2. Technology Stack & Model Selection

We will use **OpenRouter** as our API gateway. This allows us to access the latest state-of-the-art models without managing separate billing/infrastructure for each provider.

### Selected Model: Google Gemini 2.0 Flash
*   **Provider:** Google (via OpenRouter)
*   **Model ID:** `google/gemini-2.0-flash-exp:free` (or `google/gemini-2.0-flash-001`)
*   **Why this model?**
    *   **Performance:** Significantly smarter and faster than Gemini 1.5 Pro/Flash.
    *   **Context:** Massive context window (1M+ tokens), allowing it to maintain consistency in long lessons.
    *   **Cost:** Currently available via free/low-cost tiers on OpenRouter (unlike the restricted Gemini 3.1 Preview).
*   **Fallback Model:** `meta-llama/llama-3.3-70b-instruct` (if Google rate limits are hit).

---

## 3. Implementation Strategy: Reading Content

### A. User Experience (UX) Flow
1.  **Trigger:** Inside the "Add Reading Content" modal or the Rich Text Editor, add an **"✨ AI Assistant"** button.
2.  **Input:** A simplified modal opens asking for:
    *   **Topic:** (e.g., "Photosynthesis")
    *   **Target Audience:** (e.g., "Beginner", "Advanced")
    *   **Tone:** (e.g., "Academic", "Casual/Fun")
3.  **Generation:** User clicks "Generate Draft". A loading state appears.
4.  **Review (Crucial):** The generated content appears in a **Preview Window**.
    *   *Action:* User can click "Insert" to add it to the editor.
    *   *Action:* User can click "Regenerate" to try again.
5.  **Editing:** Once inserted, the text behaves like normal text in the `ProfessionalRichTextEditor`.

### B. Technical Implementation (Backend)

We will utilize the **OpenAI SDK** pointed at OpenRouter URLs.

**1. Environment Variables (`.env`)**
```bash
# Point to OpenRouter
AI_BASE_URL="https://openrouter.ai/api/v1"
AI_API_KEY="sk-or-your-key-here"

# Set the Model ID here so we can swap it easily later without code changes
AI_MODEL_ID="google/gemini-2.0-flash-exp:free"







System Prompt Structure To ensure high-quality HTML/Markdown output that doesn't break the frontend editor:

"You are an expert educational content creator. Your task is to write a comprehensive lesson on the user's topic.

Rules:

Output strictly in Markdown format (Use # for headers, ** for bold, - for lists).
Do NOT output conversational filler like 'Here is your lesson'. Start directly with the content.
Structure the content with an Introduction, Key Concepts, Examples, and a Summary.
Keep the tone encouraging and professional."
C. Technical Implementation (Frontend)
Markdown to HTML Conversion: Since the AI generates Markdown (safest for stability), the frontend must convert this to HTML before injecting it into the Rich Text Editor.

Libraries: Use marked or react-markdown to parse the API response.
Injection:
JavaScript

// Pseudo-code for handling the response
const handleInsert = (markdownText) => {
   const htmlContent = marked.parse(markdownText);
   editor.commands.setContent(htmlContent); // Tiptap/Quill specific command
};
4. Phase 2: Video Content (Future Scope)
Status: ⏸️ Deferred

We have evaluated the requirements for Video Content generation.

Current Limitation: Generating actual video files (MP4) via AI is currently too slow and expensive for a free-tier feature.
Planned Solution: When we revisit this, we will implement YouTube Curation (finding the best existing educational videos) and Script Generation (helping teachers record their own videos).
Timeline: To be determined after the successful launch of Phase 1.
5. Development Checklist
 Setup: Register on OpenRouter and get API Key.
 Config: Update .env file with AI_BASE_URL and AI_MODEL_ID.
 Backend: Create API route (e.g., POST /api/ai/generate-lesson) using OpenAI SDK.
 Frontend: Create "AI Input Modal" component.
 Frontend: Integrate Markdown-to-HTML converter.
 Testing: Verify Gemini 2.0 Flash output quality and formatting.
 Production: Deploy and monitor OpenRouter usage credits/limits.

 