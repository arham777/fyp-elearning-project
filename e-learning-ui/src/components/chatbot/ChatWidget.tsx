import React from "react";
import { ChevronDown, Loader2, MessageSquare, Send, X, Maximize2, Minimize2 } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import { chatbotApi, ReasoningStep } from "@/api/chatbot";
import { getTokens } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription as AlertDescription,
  AlertDialogFooter as AlertFooter,
  AlertDialogHeader as AlertHeader,
  AlertDialogTitle as AlertTitle,
  AlertDialogTrigger as AlertTrigger,
} from '@/components/ui/alert-dialog';

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
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const historyLoadedRef = React.useRef<string | null>(null);
  const [copiedBlockId, setCopiedBlockId] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const location = useLocation();
  const isDashboard = location.pathname === '/app' || location.pathname === '/app/';
  const [isPartiallyHidden, setIsPartiallyHidden] = React.useState(false);
  const hideTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startHideTimer = React.useCallback(() => {
    if (isDashboard || isOpen) {
      setIsPartiallyHidden(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsPartiallyHidden(true);
    }, 5000);
  }, [isDashboard, isOpen]);

  React.useEffect(() => {
    startHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [startHideTimer, location.pathname]);

  const scrollToBottom = React.useCallback((behavior: "smooth" | "auto" = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const handleScroll = React.useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  }, []);

  // Scroll to bottom when chat opens or history finishes loading
  React.useEffect(() => {
    if (isOpen && !isLoadingHistory) {
      setTimeout(() => scrollToBottom("auto"), 50);
      setTimeout(() => scrollToBottom("auto"), 300); // Fallback for slower renders
    }
  }, [isOpen, isLoadingHistory, scrollToBottom]);

  // Auto-scroll when messages update (e.g. streaming), if user is near the bottom
  React.useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom("smooth");
    }
  }, [messages, showScrollButton, scrollToBottom]);

  const sessionKey = React.useMemo(
    () => (user?.id ? `chatbot_session_${user.id}` : "chatbot_session"),
    [user?.id],
  );

  // Restore session ID from localStorage on mount
  React.useEffect(() => {
    try {
      const existing = localStorage.getItem(sessionKey) || undefined;
      setSessionId(existing);
    } catch {
      setSessionId(undefined);
    }
  }, [sessionKey]);

  // Load chat history from DB when widget opens (only once per session)
  React.useEffect(() => {
    if (!isOpen || !sessionId || historyLoadedRef.current === sessionId) return;
    // Don't reload if we already have messages for this session
    if (messages.length > 0) {
      historyLoadedRef.current = sessionId;
      return;
    }

    let cancelled = false;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await chatbotApi.getSessionMessages(sessionId);
        if (cancelled) return;
        const restored: ChatMessage[] = [];
        for (const msg of data.messages) {
          if (msg.status === "error") continue;
          // Add user message
          restored.push({
            id: `hist-u-${msg.id}`,
            role: "user",
            text: msg.query,
            reasoning: [],
          });
          // Add assistant message
          if (msg.response) {
            const thinkingSteps = (msg.reasoning_trace || []).filter(
              (s: ReasoningStep) => s.stage === "thinking",
            );
            restored.push({
              id: `hist-a-${msg.id}`,
              role: "assistant",
              text: msg.response,
              source: msg.source as "cerebras" | "fallback" | undefined,
              reasoning: thinkingSteps,
            });
          }
        }
        if (!cancelled && restored.length > 0) {
          setMessages(restored);
        }
        historyLoadedRef.current = sessionId;
      } catch {
        // Silently fail — user can still chat, just without history
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };
    void loadHistory();
    return () => { cancelled = true; };
  }, [isOpen, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleInput = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Max height set to approx 3 lines (e.g. 72px)
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
    }
  }, []);



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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
    }
    setIsSending(true);
    setTimeout(() => scrollToBottom("smooth"), 50); // Force scroll on user send

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
          if (event.type === "tool_call") {
            // Silently ignore tool call events — they are internal
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
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "I could not process that right now. Please try again.";
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

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  if (!isOpen) {
    return (
      <Button
        onMouseEnter={() => {
          setIsPartiallyHidden(false);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }}
        onMouseLeave={startHideTimer}
        onClick={(e) => {
          if (isPartiallyHidden) {
            e.preventDefault();
            setIsPartiallyHidden(false);
            startHideTimer();
          } else {
            setIsOpen(true);
          }
        }}
        className={`fixed bottom-10 right-0 sm:right-10 h-28 w-28 z-50 transition-all duration-500 ease-in-out bg-transparent hover:bg-transparent shadow-none border-none p-0 overflow-visible group ${isPartiallyHidden ? "translate-x-20 opacity-60 hover:opacity-100" : "hover:scale-110 translate-x-0 opacity-100"
          }`}
        style={{ right: isPartiallyHidden ? '0px' : undefined }} // Ensure it hugs the edge on mobile when hidden
        size="icon"
      >
        <div className="w-full h-full drop-shadow-2xl filter hover:drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] transition-all duration-300 relative">
          {isPartiallyHidden && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-background/80 backdrop-blur-sm border border-border p-1 rounded-l-md shadow-md animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="m15 18-6-6 6-6" /></svg>
            </div>
          )}
          <DotLottieReact
            src="/chatbot.lottie"
            loop
            autoplay
            className="w-full h-full"
          />
        </div>
        <span className="absolute top-4 right-4 h-4 w-4 mt-1 mr-1 flex pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white/50"></span>
        </span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end p-4 sm:p-6" aria-label="Chatbot Container">
      <section
        className={`pointer-events-auto relative flex flex-col bg-background rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ease-in-out w-[calc(100vw-2rem)] h-[80vh] max-h-[calc(100vh-2rem)] ${isExpanded
          ? "sm:w-[800px] sm:h-[85vh] sm:max-h-[900px]"
          : "sm:w-[380px] sm:h-[600px] sm:max-h-[600px]"
          }`}
      >
        <header className="flex items-center justify-between px-4 py-4 bg-muted border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm overflow-hidden border border-border/50 shadow-sm">
              <div className="absolute inset-0 scale-150 mt-2">
                <DotLottieReact
                  src="/chatbot.lottie"
                  loop
                  autoplay
                />
              </div>
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
            <AlertDialog>
              <AlertTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  title="Clear chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
                </Button>
              </AlertTrigger>
              <AlertContent>
                <AlertHeader>
                  <AlertTitle>Clear chat history?</AlertTitle>
                  <AlertDescription>
                    This will permanently delete your current conversation history. You cannot undo this action.
                  </AlertDescription>
                </AlertHeader>
                <AlertFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    setMessages([]);
                    setSessionId(undefined);
                    historyLoadedRef.current = null;
                    try { localStorage.removeItem(sessionKey); } catch { /* ignore */ }
                  }}>
                    Clear Chat
                  </AlertDialogAction>
                </AlertFooter>
              </AlertContent>
            </AlertDialog>
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

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          {isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              <p className="text-xs text-muted-foreground">Loading conversation...</p>
            </div>
          )}
          {!messages.length && !isLoadingHistory && (
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
          {messages.map((message) => {
            // Only show model's actual "thinking" — filter out internal stages (intent, tooling, synthesis, prompt)
            const thinkingSteps = message.reasoning.filter((step) => step.stage === "thinking");

            return (
              <div key={message.id} className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col max-w-[85%] min-w-0 ${message.role === "user" ? "items-end" : "items-start"}`}>

                  {/* ── Thinking section — rendered ABOVE the response ── */}
                  {message.role === "assistant" && thinkingSteps.length > 0 && REASONING_ENABLED_DEFAULT && (
                    <div className="mb-2 w-full">
                      {/* While streaming and no text yet, show auto-expanded live thinking */}
                      {message.isStreaming && !message.text ? (
                        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-muted/40 p-3 text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-4 w-4 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/30" />
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary relative" />
                            </div>
                            <span className="font-semibold text-primary/80 text-[11px] uppercase tracking-wider">Thinking...</span>
                          </div>
                          {thinkingSteps.map((step, index) => (
                            <div key={`${message.id}-think-${index}`} className="flex gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1 shrink-0" />
                              <div className="text-muted-foreground leading-normal whitespace-pre-wrap">{step.text}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* After streaming or when text has arrived — collapsible toggle */
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground w-full justify-between border border-border/40 hover:border-border/70 rounded-lg bg-muted/20"
                            onClick={() =>
                              setExpandedReasoning((prev) => ({ ...prev, [message.id]: !prev[message.id] }))
                            }
                          >
                            <span className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4" />
                                <path d="M12 8h.01" />
                              </svg>
                              Thought Process
                              {message.isStreaming && (
                                <Loader2 className="h-2.5 w-2.5 animate-spin ml-1" />
                              )}
                            </span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform duration-200 ${expandedReasoning[message.id] ? "rotate-180" : ""}`}
                            />
                          </Button>
                          {expandedReasoning[message.id] && (
                            <div className="mt-1.5 rounded-lg border border-border/30 bg-muted/20 p-3 text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1">
                              {thinkingSteps.map((step, index) => (
                                <div key={`${message.id}-think-${index}`} className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                  <div className="text-muted-foreground leading-normal whitespace-pre-wrap">{step.text}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Main response bubble ── */}
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
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          pre: ({ children }) => (
                            <div className="not-prose my-3 rounded-xl overflow-hidden border border-border/60 bg-[#1e1e2e] shadow-lg">
                              {children}
                            </div>
                          ),
                          code: ({ node, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !className;
                            if (isInline) {
                              return (
                                <code
                                  className="bg-muted/80 text-primary px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-border/30"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            const lang = match?.[1] || "code";
                            const codeText = String(children).replace(/\n$/, "");
                            const blockId = `code-${message.id}-${lang}-${codeText.length}`;
                            const isCopied = copiedBlockId === blockId;
                            return (
                              <>
                                <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-white/5">
                                  <span className="text-[11px] font-mono text-[#cdd6f4]/60 uppercase tracking-wider">{lang}</span>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-[11px] text-[#cdd6f4]/50 hover:text-[#cdd6f4] transition-colors"
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeText).then(() => {
                                        setCopiedBlockId(blockId);
                                        setTimeout(() => setCopiedBlockId(null), 2000);
                                      });
                                    }}
                                  >
                                    {isCopied ? (
                                      <><Check className="h-3 w-3" /> Copied!</>
                                    ) : (
                                      <><Copy className="h-3 w-3" /> Copy</>
                                    )}
                                  </button>
                                </div>
                                <pre className="!m-0 !bg-transparent overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                  <code className={`text-[13px] leading-relaxed font-mono text-[#cdd6f4] ${className || ""}`} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="not-prose w-full max-w-full my-4 rounded-xl border-2 border-white border-solid overflow-hidden bg-background/50">
                              <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                <table className="w-full text-[12px] text-left border-collapse m-0" {...props} />
                              </div>
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-muted/50 text-foreground text-[16px]" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-3 font-semibold border-b-2 border-r-2 border-white border-solid last:border-r-0 whitespace-nowrap text-left" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-3 border-b-2 border-r-2 border-white border-solid last:border-r-0 align-top" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="[&:last-child>td]:border-b-0 hover:bg-muted/30 transition-colors" {...props} />
                          ),
                          a: ({ node, href, children, ...props }) => (
                            <a
                              href={href}
                              onClick={(e) => {
                                if (href?.startsWith("/")) {
                                  e.preventDefault();
                                  navigate(href);
                                }
                              }}
                              className="text-primary font-medium hover:underline cursor-pointer transition-colors"
                              {...props}
                            >
                              {children}
                            </a>
                          )
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    ) : message.isStreaming ? (
                      /* Only show "Thinking..." placeholder when there's no reasoning yet */
                      message.reasoning.length === 0 ? (
                        <span className="animate-pulse">Thinking...</span>
                      ) : null
                    ) : (
                      ""
                    )}
                  </div>

                  {message.isStreaming && message.text && (
                    <span className="text-[10px] text-muted-foreground mt-1 animate-pulse flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Generating...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-px shrink-0" />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            size="icon"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-20 right-6 h-9 w-9 rounded-full shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground border border-border z-10 opacity-90 transition-opacity hover:opacity-100"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}

        <footer className="p-3 bg-background border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="relative flex items-center"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="pr-12 min-h-[40px] max-h-[72px] resize-none overflow-y-auto rounded-xl sm:rounded-2xl border-muted-foreground/20 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 py-2.5"
              disabled={isSending || !getTokens()?.access}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !input.trim()}
              className={`absolute right-1.5 bottom-1.5 h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-sm transition-all duration-200 ${input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
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

