"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  Sparkles,
  Upload,
  Check,
  X,
  RotateCcw,
  Trophy,
  Timer,
  Lightbulb,
} from "lucide-react";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  topic: string;
  explanation: string;
};

type Phase = "setup" | "playing" | "result";

const PER_QUESTION_SECONDS = 30;

export function QuizGenerator() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  // Per-question countdown timer.
  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    if (timeLeft <= 0) {
      lockAnswer(null);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, selected]);

  async function generate(formData: FormData) {
    const file = fileRef.current?.files?.[0];
    const text = String(formData.get("text") || "").trim();
    if (!file && !text) {
      toast.error("Add some notes or upload a PDF first.");
      return;
    }

    const payload = new FormData();
    if (file) payload.append("file", file);
    if (text) payload.append("text", text);
    payload.append("count", String(formData.get("count") || 5));

    setLoading(true);
    try {
      const res = await fetch("/api/ai/quiz", { method: "POST", body: payload });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate quiz");
      }
      const data = await res.json();
      const qs: QuizQuestion[] = data.questions || [];
      if (qs.length === 0) throw new Error("No questions returned");

      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrent(0);
      setSelected(null);
      setTimeLeft(PER_QUESTION_SECONDS);
      setPhase("playing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function lockAnswer(choice: number | null) {
    setSelected(choice ?? -1);
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = choice;
      return next;
    });
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setPhase("result");
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setTimeLeft(PER_QUESTION_SECONDS);
  }

  function reset() {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const score = answers.reduce<number>(
    (acc, ans, i) => (ans !== null && ans === questions[i]?.correctIndex ? acc + 1 : acc),
    0
  );

  // Topics where the user got at least one wrong, for the weak-area summary.
  const weakTopics = Array.from(
    new Set(
      questions
        .filter((q, i) => answers[i] !== q.correctIndex)
        .map((q) => q.topic)
    )
  );

  return (
    <section className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 group-hover:bg-purple-500/10 transition-colors duration-500" />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Quiz Me</h2>
          <p className="text-sm text-muted-foreground">
            Turn your notes or a PDF into a timed practice test.
          </p>
        </div>
      </div>

      {phase === "setup" && (
        <form action={generate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-1">
              Paste your notes
            </label>
            <textarea
              name="text"
              rows={4}
              placeholder="Paste study material here, or upload a PDF below..."
              className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 focus:bg-background transition-colors resize-none text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-xl border border-dashed border-border/60 bg-background/30 px-4 py-2.5 text-sm font-medium hover:bg-background/60 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {fileName || "Upload PDF"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
            <div className="space-y-1.5 sm:w-32">
              <select
                name="count"
                defaultValue="5"
                className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm focus:bg-background transition-colors"
              >
                <option value="3">3 questions</option>
                <option value="5">5 questions</option>
                <option value="8">8 questions</option>
                <option value="10">10 questions</option>
              </select>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <span className="animate-spin">
                <Sparkles className="h-4 w-4" />
              </span>
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Building your quiz..." : "Generate Quiz"}
          </button>
        </form>
      )}

      {phase === "playing" && questions[current] && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Question {current + 1} / {questions.length}
            </span>
            <span
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg ${
                timeLeft <= 5 && selected === null
                  ? "bg-red-500/10 text-red-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              {timeLeft}s
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          <p className="font-semibold text-base leading-relaxed">
            {questions[current].question}
          </p>

          <div className="space-y-2.5">
            {questions[current].options.map((opt, i) => {
              const isCorrect = i === questions[current].correctIndex;
              const isPicked = selected === i;
              const answered = selected !== null;

              let style =
                "border-border/50 bg-background/30 hover:bg-background/60 hover:border-border";
              if (answered && isCorrect)
                style = "border-emerald-500/50 bg-emerald-500/10";
              else if (answered && isPicked && !isCorrect)
                style = "border-red-500/50 bg-red-500/10";
              else if (answered) style = "border-border/50 bg-background/30 opacity-60";

              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => lockAnswer(i)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all flex items-center justify-between gap-3 ${style}`}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  {answered && isPicked && !isCorrect && (
                    <X className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="space-y-4 animate-slide-up">
              {questions[current].explanation && (
                <div className="flex gap-2.5 items-start p-3 rounded-xl border border-border/50 bg-background/30 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{questions[current].explanation}</p>
                </div>
              )}
              <button
                onClick={nextQuestion}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition-all"
              >
                {current + 1 >= questions.length ? "See Results" : "Next Question"}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-5 animate-slide-up text-center">
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <Trophy className="h-8 w-8" />
            </div>
            <p className="text-4xl font-bold">
              {score}
              <span className="text-2xl text-muted-foreground">/{questions.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {score === questions.length
                ? "Perfect score! You've mastered this. 🎯"
                : score >= questions.length / 2
                  ? "Solid work — review the misses and go again."
                  : "Good start. Revisit the weak topics below and retry."}
            </p>
          </div>

          {weakTopics.length > 0 && (
            <div className="text-left p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" /> Topics to review
              </p>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> New Quiz
          </button>
        </div>
      )}
    </section>
  );
}
