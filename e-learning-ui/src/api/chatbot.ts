import apiClient, { getTokens } from "./apiClient";

export interface ChatbotFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ReasoningStep {
  stage: "intent" | "tooling" | "synthesis" | string;
  text: string;
}

export interface ChatbotResponse {
  response: string;
  function_calls?: ChatbotFunctionCall[];
  reasoning_trace?: ReasoningStep[];
  source?: "cerebras" | "fallback";
  warning?: string | null;
  session_id?: string;
  message_id?: number;
  model_name?: string;
  token_count_input?: number;
  token_count_output?: number;
}

export interface ChatbotStreamEvent {
  type: "meta" | "reasoning" | "reasoning_token" | "tool_call" | "token" | "done" | "error";
  data: Record<string, unknown>;
}

export interface StreamQueryInput {
  query: string;
  session_id?: string;
  show_reasoning?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim?.() || "";

const parseSseBlock = (block: string): ChatbotStreamEvent | null => {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;

  const type = eventLine.replace("event:", "").trim() as ChatbotStreamEvent["type"];
  const rawData = dataLine.replace("data:", "").trim();
  try {
    return { type, data: JSON.parse(rawData) as Record<string, unknown> };
  } catch {
    return null;
  }
};

const resolveStreamUrl = () => {
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/chatbot/stream/`;
  }
  return "/api/chatbot/stream/";
};

export interface ChatMessageRecord {
  id: number;
  session: string;
  role: string;
  query: string;
  response: string;
  function_calls: ChatbotFunctionCall[];
  reasoning_trace: ReasoningStep[];
  source: "cerebras" | "gemini" | "fallback";
  status: "completed" | "error" | "partial";
  created_at: string;
}

export interface SessionMessagesResponse {
  session: {
    id: string;
    role: string;
    title: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
  };
  messages: ChatMessageRecord[];
}

export const chatbotApi = {
  async sendQuery(payload: StreamQueryInput): Promise<ChatbotResponse> {
    const { data } = await apiClient.post<ChatbotResponse>("/chatbot/query/", payload);
    return data;
  },

  async getSessionMessages(sessionId: string): Promise<SessionMessagesResponse> {
    const { data } = await apiClient.get<SessionMessagesResponse>(
      `/chatbot/sessions/${sessionId}/messages/`,
      { params: { limit: 50 } },
    );
    return data;
  },

  async streamQuery(
    payload: StreamQueryInput,
    onEvent: (event: ChatbotStreamEvent) => void,
  ): Promise<void> {
    const tokens = getTokens();
    const response = await fetch(resolveStreamUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Stream request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let markerIndex = buffer.indexOf("\n\n");
      while (markerIndex !== -1) {
        const block = buffer.slice(0, markerIndex);
        buffer = buffer.slice(markerIndex + 2);
        const event = parseSseBlock(block);
        if (event) onEvent(event);
        markerIndex = buffer.indexOf("\n\n");
      }
    }
  },
};


