"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Source = {
  id: string;
  score?: number;
  sectionTitle?: string;
  docName?: string;
  chunkType?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi, I’m your Digital Support Assistant. Ask me an issue like: User cannot access ERP after permission change.",
};

type ParsedAnswer = {
  recommendedAction?: string;
  steps: string[];
  whyLikely: string[];
  escalateWhen: string[];
  confidence?: string;
};

function parseAssistantAnswer(text: string): ParsedAnswer {
  const lines = text.split("\n").map((line) => line.trim());

  const parsed: ParsedAnswer = {
    steps: [],
    whyLikely: [],
    escalateWhen: [],
  };

  let section: "" | "recommended" | "steps" | "why" | "escalate" | "confidence" = "";

  for (const line of lines) {
    if (!line) continue;

    if (line.toLowerCase().startsWith("recommended action:")) {
      section = "recommended";
      parsed.recommendedAction = line.replace(/recommended action:/i, "").trim();
      continue;
    }

    if (line.toLowerCase().startsWith("steps:")) {
      section = "steps";
      continue;
    }

    if (line.toLowerCase().startsWith("why this is likely:")) {
      section = "why";
      continue;
    }

    if (line.toLowerCase().startsWith("escalate when:")) {
      section = "escalate";
      continue;
    }

    if (line.toLowerCase().startsWith("confidence:")) {
      section = "confidence";
      parsed.confidence = line.replace(/confidence:/i, "").trim();
      continue;
    }

    if (section === "recommended") {
      parsed.recommendedAction = parsed.recommendedAction
        ? `${parsed.recommendedAction} ${line.replace(/^-/, "").trim()}`
        : line.replace(/^-/, "").trim();
    } else if (section === "steps") {
      parsed.steps.push(line.replace(/^\d+\.\s*/, "").replace(/^-/, "").trim());
    } else if (section === "why") {
      parsed.whyLikely.push(line.replace(/^-/, "").trim());
    } else if (section === "escalate") {
      parsed.escalateWhen.push(line.replace(/^-/, "").trim());
    } else if (section === "confidence") {
      parsed.confidence = parsed.confidence
        ? `${parsed.confidence} ${line.replace(/^-/, "").trim()}`
        : line.replace(/^-/, "").trim();
    }
  }

  return parsed;
}

function AssistantAnswerCard({ content }: { content: string }) {
  const parsed = parseAssistantAnswer(content);

  const hasStructuredContent =
    parsed.recommendedAction ||
    parsed.steps.length > 0 ||
    parsed.whyLikely.length > 0 ||
    parsed.escalateWhen.length > 0 ||
    parsed.confidence;

  if (!hasStructuredContent) {
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm leading-6">
      {parsed.recommendedAction && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommended Action
          </div>
          <p className="text-slate-900">{parsed.recommendedAction}</p>
        </div>
      )}

      {parsed.steps.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Steps
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-slate-900">
            {parsed.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {parsed.whyLikely.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why this is likely
          </div>
          <ul className="list-disc space-y-1 pl-5 text-slate-900">
            {parsed.whyLikely.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed.escalateWhen.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Escalate when
          </div>
          <ul className="list-disc space-y-1 pl-5 text-slate-900">
            {parsed.escalateWhen.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed.confidence && (
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Confidence
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {parsed.confidence}
          </span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || data?.error || "Request failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No answer returned.",
          sources: data.sources || [],
        },
      ]);
    } catch (err: any) {
      const message = err?.message || "Error connecting to server";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t complete the request. Please try again or contact support if the issue continues.",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
    setQuery("");
    setError("");
    textareaRef.current?.focus();
  }

  const latestAssistantWithSources = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.sources?.length);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">LNCloudSuite Assistant</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ask an issue and get a grounded resolution from your knowledge base.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/upload"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Admin Upload
            </Link>

            <button
              onClick={clearChat}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-4 h-[560px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div
                        className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                          msg.role === "user" ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {msg.role === "user" ? "You" : "Assistant"}
                      </div>

                      {msg.role === "assistant" ? (
                        <AssistantAnswerCard content={msg.content} />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
                          {msg.content}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the issue here..."
                className="min-h-[120px] w-full rounded-2xl border border-slate-300 p-4 text-sm outline-none transition focus:border-slate-500"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Press Enter to send. Press Shift + Enter for a new line.
                </p>

                <button
                  onClick={sendMessage}
                  disabled={loading || !query.trim()}
                  className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sources</h2>

            <div className="space-y-3">
              {latestAssistantWithSources?.sources?.length ? (
                latestAssistantWithSources.sources.map((source, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {source.sectionTitle || "Unknown section"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {source.docName || "Unknown document"}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {source.chunkType || "unknown"}
                      </span>

                      {typeof source.score === "number" && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          Score {source.score.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Sources will appear here after the assistant responds.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}