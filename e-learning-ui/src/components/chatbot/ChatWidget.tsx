import React from "react";
import { ChevronDown, Loader2, MessageSquare, Send, X, Maximize2, Minimize2 } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { chatbotApi, ReasoningStep } from "@/api/chatbot";
import { getTokens } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  source?: "cerebras" | "fallback";
  reasoning: ReasoningStep[];
  isStreaming?: boolean;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const REASONING_ENABLED_DEFAULT =
  (import.meta.env.VITE_CHATBOT_REASONING_UI_ENABLED ?? "true").toString().toLowerCase() !== "false";

const ChatWidget: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | undefined>();
  const [expandedReasoning, setExpandedReasoning] = React.useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = React.useState(false);

  const sessionKey = React.useMemo(
    () => (user?.id ? `chatbot_session_${user.id}` : "chatbot_session"),
    [user?.id],
  );

  React.useEffect(() => {
    try {
      const existing = localStorage.getItem(sessionKey) || undefined;
      setSessionId(existing);
    } catch {
      setSessionId(undefined);
    }
  }, [sessionKey]);

  const updateAssistantMessage = React.useCallback(
    (assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          return updater(m);
        }),
      );
    },
    [],
  );

  const saveSessionId = React.useCallback(
    (nextSessionId?: string) => {
      if (!nextSessionId) return;
      setSessionId(nextSessionId);
      try {
        localStorage.setItem(sessionKey, nextSessionId);
      } catch {
        // ignore localStorage quota/safety errors
      }
    },
    [sessionKey],
  );



  const handleSend = React.useCallback(async () => {
    const query = input.trim();
    if (!query || isSending) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      text: query,
      reasoning: [],
    };
    const assistantId = makeId();
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      reasoning: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsSending(true);

    try {
      await chatbotApi.streamQuery(
        {
          query,
          session_id: sessionId,
          show_reasoning: REASONING_ENABLED_DEFAULT,
        },
        (event) => {
          if (event.type === "meta") {
            const sid = (event.data.session_id as string | undefined) || undefined;
            saveSessionId(sid);
            return;
          }
          if (event.type === "reasoning") {
            if (!REASONING_ENABLED_DEFAULT) return;
            const stage = String(event.data.stage || "synthesis");
            const text = String(event.data.text || "");
            updateAssistantMessage(assistantId, (message) => ({
              ...message,
              reasoning: [...message.reasoning, { stage, text }],
            }));
            return;
          }
          if (event.type === "reasoning_token") {
            if (!REASONING_ENABLED_DEFAULT) return;
            const text = String(event.data.text || "");
            updateAssistantMessage(assistantId, (message) => {
              const reasoning = [...message.reasoning];
              if (reasoning.length === 0 || reasoning[reasoning.length - 1].stage !== "thinking") {
                reasoning.push({ stage: "thinking", text });
              } else {
                const lastIdx = reasoning.length - 1;
                reasoning[lastIdx] = {
                  ...reasoning[lastIdx],
                  text: reasoning[lastIdx].text + text,
                };
              }
              return { ...message, reasoning };
            });
            return;
          }
          if (event.type === "token") {
            const text = String(event.data.text || "");
            updateAssistantMessage(assistantId, (message) => ({
              ...message,
              text: `${message.text}${text}`,
            }));
            return;
          }
          if (event.type === "done") {
            const source = (event.data.source as "cerebras" | "fallback" | undefined) || "cerebras";
            const warning = (event.data.warning as string | null | undefined) ?? null;
            updateAssistantMessage(assistantId, (message) => ({
              ...message,
              source,
              isStreaming: false,
            }));
            if (source === "fallback" && warning) {
              toast({
                title: "AI fallback mode",
                description: warning,
              });
            }
            return;
          }
          if (event.type === "error") {
            throw new Error(String(event.data.message || "Stream failed"));
          }
        },
      );
      updateAssistantMessage(assistantId, (message) => ({ ...message, isStreaming: false }));
    } catch (err: any) {
      const errorMessage = err.message || "I could not process that right now. Please try again.";
      updateAssistantMessage(assistantId, (message) => ({
        ...message,
        text: errorMessage,
        isStreaming: false,
        source: "cerebras",
      }));
      toast({
        title: "Chatbot Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, saveSessionId, sessionId, toast, updateAssistantMessage]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-105 transition-transform duration-200 bg-transparent hover:bg-transparent text-primary-foreground p-0 overflow-visible"
        size="icon"
      >
        <img src="/chat.png" alt="Chat" className="h-full w-full object-contain drop-shadow-md" />
        <span className="absolute top-0 right-0 h-3 w-3 -mt-1 -mr-1 flex">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end p-4 sm:p-6" aria-label="Chatbot Container">
      <section
        className={`pointer-events-auto flex flex-col bg-background rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ease-in-out w-[calc(100vw-2rem)] h-[80vh] max-h-[calc(100vh-2rem)] ${isExpanded
            ? "sm:w-[800px] sm:h-[85vh] sm:max-h-[900px]"
            : "sm:w-[380px] sm:h-[600px] sm:max-h-[600px]"
          }`}
      >
        <header className="flex items-center justify-between px-4 py-4 bg-muted border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm overflow-hidden p-1 border border-border/50">
              <img src="/chat.png" alt="Bot" className="h-full w-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-none tracking-tight text-foreground">Your AI Assistant</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-xs font-medium text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => setMessages([])}
              title="Clear chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {!messages.length && (
            <div className="flex flex-col space-y-6 mt-4">
              <div className="text-center space-y-2">
                <div className="bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">👋</span>
                </div>
                <h4 className="font-semibold text-foreground">Hello there!</h4>
                <p className="text-sm text-muted-foreground px-4">I can help you find courses, create learning paths, or answer your questions.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Actions</p>
                <div className="grid gap-2">
                  {[
                    { label: "Find Top Courses", icon: "🎓", query: "What are the top rated courses available?" },
                    { label: "Create Learning Path", icon: "🗺️", query: "Create a learning roadmap for full stack development for me." },
                    { label: "My Progress", icon: "bfs", query: "Show me my learning progress and analytics." },
                    { label: "Help Center", icon: "💡", query: "How do I get a certificate?" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setInput(action.query);
                        // Optional: auto-send
                      }}
                      className="flex items-center gap-3 p-3 text-left bg-muted/30 hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-xl transition-all duration-200 group"
                    >
                      <span className="text-lg bg-background shadow-sm w-8 h-8 flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform">
                        {action.icon === "bfs" ? <Loader2 className="h-4 w-4" /> : action.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-primary">{action.label}</span>
                      <Send className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-primary -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex flex-col max-w-[85%] min-w-0 ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-2.5 text-sm shadow-sm leading-relaxed overflow-x-auto ${message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm whitespace-pre-wrap break-words"
                    : "bg-muted border text-foreground rounded-2xl rounded-tl-sm prose prose-sm dark:prose-invert max-w-full prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 break-words"
                    }`}
                >
                  {message.role === "user" ? (
                    message.text
                  ) : message.text ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="not-prose w-full max-w-full my-4 rounded-xl border-2 border-white border-solid overflow-hidden bg-background/50">
                            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                              <table className="w-full text-sm text-left border-collapse m-0" {...props} />
                            </div>
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-muted/50 text-foreground" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="px-4 py-3 font-semibold border-b-2 border-r-2 border-white border-solid last:border-r-0 whitespace-nowrap" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-4 py-3 border-b-2 border-r-2 border-white border-solid last:border-r-0 align-top" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                          <tr className="[&:last-child>td]:border-b-0 hover:bg-muted/30 transition-colors" {...props} />
                        )
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : message.isStreaming ? (
                    <span className="animate-pulse">Thinking...</span>
                  ) : (
                    ""
                  )}
                </div>

                {message.isStreaming && message.text && (
                  <span className="text-[10px] text-muted-foreground mt-1 animate-pulse flex items-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> Generating...
                  </span>
                )}

                {message.role === "assistant" && message.reasoning.length > 0 && REASONING_ENABLED_DEFAULT && (
                  <div className="mt-2 w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground w-full justify-between border border-transparent hover:border-border/50"
                      onClick={() =>
                        setExpandedReasoning((prev) => ({ ...prev, [message.id]: !prev[message.id] }))
                      }
                    >
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3" />
                        Thought Process
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${expandedReasoning[message.id] ? "rotate-180" : ""
                          }`}
                      />
                    </Button>
                    {expandedReasoning[message.id] && (
                      <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1">
                        {message.reasoning.map((step, index) => (
                          <div key={`${message.id}-reason-${index}`} className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1 shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground/80 lowercase">{step.stage}</span>
                              <div className="text-muted-foreground mt-0.5 leading-normal whitespace-pre-wrap">{step.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="p-3 bg-background border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="relative flex items-center"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="pr-12 h-10 rounded-full border-muted-foreground/20 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 placeholder:text-muted-foreground/50"
              disabled={isSending || !getTokens()?.access}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !input.trim()}
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-sm transition-all duration-200 ${input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
                }`}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </form>
        </footer>
      </section>
    </div>
  );
};

export default ChatWidget;

