"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Send,
  ImagePlus,
  X,
  Sparkles,
  Bot,
  User as UserIcon,
  Loader2,
  Eraser,
} from "lucide-react";
import { MarkdownLite } from "@/components/markdown-lite";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Solve: 2x + 5 = 15",
  "Summarize Newton's laws",
  "Give me 5 tips to focus better",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function send(text: string) {
    const content = text.trim();
    if ((!content && !image) || sending) return;

    const userMsg: Msg = { role: "user", content: content || "Please help me with this image.", image: image || undefined };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    const sentImage = image;
    setImage(null);
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          image: sentImage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ " + (e instanceof Error ? e.message : "AI is unavailable. Please try again in a moment."),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 glass rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-background/40">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">StudyFlow Tutor</p>
            <p className="text-[11px] text-muted-foreground">Ask anything · upload a photo of your doubt</p>
          </div>
        </div>
        {!empty && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-1.5 hover:bg-muted transition-colors"
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5 px-4">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-primary/10 to-indigo-500/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">How can I help you study today?</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask a question, paste a problem, or upload a photo of your homework and I&apos;ll solve it step by step.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 hover:bg-muted hover:border-border transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`flex w-full gap-3.5 animate-slide-up ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                
                <div
                  className={`max-w-[78%] rounded-2xl px-4.5 py-3 shadow-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-background/60 border border-border/50 rounded-tl-none"
                  }`}
                >
                  {m.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image}
                      alt="attachment"
                      className="mb-2 rounded-lg max-h-48 w-auto object-cover border border-white/20"
                    />
                  )}
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  ) : (
                    <MarkdownLite text={m.content} />
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex w-full gap-3.5 justify-start animate-slide-up">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-background/60 border border-border/50 px-4.5 py-3.5 flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/50 bg-background/40 p-3">
        {image && (
          <div className="relative inline-block mb-2 ml-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
            <button
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/60 p-2 focus-within:border-primary/50 transition-colors">
          <button
            onClick={() => fileRef.current?.click()}
            className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
            title="Upload image"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message StudyFlow Tutor…"
            className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-40 placeholder:text-muted-foreground"
          />
          <button
            onClick={() => void send(input)}
            disabled={sending || (!input.trim() && !image)}
            className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          AI can make mistakes — double-check important answers.
        </p>
      </div>
    </div>
  );
}
