"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  Building,
  Briefcase,
  ShieldCheck,
  Save,
} from "lucide-react";
import { RoleAssessmentSet, AssessmentQuestion } from "@/lib/assessment-engine";

interface AssessmentFormProps {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  job: {
    id: string;
    title: string;
    department: string;
  };
  assessment: RoleAssessmentSet;
}

export function AssessmentForm({
  applicationId,
  candidateId,
  candidateName,
  job,
  assessment,
}: AssessmentFormProps) {
  const router = useRouter();

  // Mode: "intro" | "form" | "confirm" | "success"
  const [mode, setMode] = useState<"intro" | "form" | "confirm" | "success">("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const storageKey = `tao_assessment_draft_${applicationId}`;

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null) {
          setAnswers(parsed);
          setLastSaved("Restored draft from previous session");
        }
      }
    } catch (e) {
      console.warn("Failed to read draft from localStorage:", e);
    }
  }, [storageKey]);

  // Save draft to localStorage on changes
  const saveDraft = (updated: Record<string, string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      const now = new Date();
      setLastSaved(`Draft auto-saved at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (e) {
      console.warn("Failed to save draft to localStorage:", e);
    }
  };

  const handleAnswerChange = (questionId: string, val: string) => {
    const updated = { ...answers, [questionId]: val };
    setAnswers(updated);
    saveDraft(updated);
  };

  const questions = assessment.questions;
  const currentQ = questions[currentQuestionIndex];

  // Calculate completed questions
  const answeredCount = questions.filter(
    (q) => (answers[q.id] || "").trim().length >= (q.minLength || 20)
  ).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  // Validate all required questions have sufficient content
  const validateAll = (): { valid: boolean; missingIndex?: number } => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = (answers[q.id] || "").trim();
      const min = q.minLength || 20;
      if (ans.length < min) {
        return { valid: false, missingIndex: i };
      }
    }
    return { valid: true };
  };

  const handleNext = () => {
    setError(null);
    const ans = (answers[currentQ.id] || "").trim();
    const min = currentQ.minLength || 20;

    if (ans.length < min) {
      setError(`Please provide a more detailed response (at least ${min} characters). Current: ${ans.length}`);
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setMode("confirm");
    }
  };

  const handlePrevious = () => {
    setError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const validation = validateAll();
    if (!validation.valid) {
      setError("Please ensure all questions are fully answered before final submission.");
      if (typeof validation.missingIndex === "number") {
        setCurrentQuestionIndex(validation.missingIndex);
        setMode("form");
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      applicationId,
      candidateId,
      responses: questions.map((q) => ({
        questionId: q.id,
        questionNumber: q.questionNumber,
        section: q.section,
        questionText: q.questionText,
        responseText: (answers[q.id] || "").trim(),
      })),
    };

    try {
      const res = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit assessment");
      }

      // Clear draft on successful submission
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        // ignore
      }

      setMode("success");
    } catch (err: any) {
      console.error("[AssessmentForm] Submission error:", err);
      setError(err.message || "An error occurred while submitting your assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 1. INTRODUCTION SCREEN ─────────────────────────────────────
  if (mode === "intro") {
    return (
      <Card className="border border-[var(--color-border)] shadow-md">
        <CardHeader className="p-6 md:p-8 space-y-4 border-b border-[var(--color-border)] bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]/20">
              <ShieldCheck size={14} /> Plan B: Online Recruitment Assessment
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <Clock size={14} /> Estimated: {assessment.estimatedMinutes} minutes
            </div>
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold text-[var(--color-foreground)]">
              {job.title} — Online Assessment
            </CardTitle>
            <CardDescription className="text-sm flex flex-wrap items-center gap-x-3 text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1">
                <Building size={14} /> {assessment.organisation}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Briefcase size={14} /> {job.department}
              </span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="space-y-4 text-sm text-[var(--color-foreground)] leading-relaxed">
            <p>
              Welcome, <strong>{candidateName}</strong>! As part of your application for the <strong>{job.title}</strong> role, this structured assessment helps us evaluate your role understanding, relevant experience, practical judgement, and alignment with our team.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-[var(--color-border)] bg-white space-y-1.5">
                <strong className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] flex items-center gap-1.5">
                  <FileText size={14} /> Form-Based Assessment
                </strong>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Written questions tailored to this position. No audio recording or live video is required.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--color-border)] bg-white space-y-1.5">
                <strong className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] flex items-center gap-1.5">
                  <Save size={14} /> Auto-Saved Drafts
                </strong>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Your answers are automatically saved to your browser so you won&apos;t lose work if interrupted.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-4 text-xs text-amber-900 space-y-1">
              <strong className="block font-semibold">Assessment Structure ({questions.length} Questions):</strong>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li><strong>Section A:</strong> Introduction and personal motivation</li>
                <li><strong>Section B:</strong> Comprehension of position responsibilities</li>
                <li><strong>Section C:</strong> Relevant practical skills and concrete project achievements</li>
                <li><strong>Section D:</strong> Realistic role scenarios and workplace problem-solving</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setMode("form")}
              className="w-full py-6 text-base font-semibold shadow-sm cursor-pointer"
            >
              Begin Assessment <ChevronRight size={18} className="ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── 2. SUCCESS CONFIRMATION SCREEN ─────────────────────────────
  if (mode === "success") {
    return (
      <Card className="border border-[var(--color-border)] shadow-md text-center py-10 px-6 animate-fade-in">
        <CardContent className="space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={36} strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
              Assessment Submitted!
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              Thank you for completing your online recruitment assessment for the{" "}
              <strong>{job.title}</strong> role at {assessment.organisation}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] text-left space-y-2">
            <p className="font-semibold text-[var(--color-foreground)]">What happens next?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Our recruitment team will review your application, CV, and assessment answers.</li>
              <li>You will receive an update regarding your application status via email.</li>
              <li>You can view the progress of all your submissions under My Applications.</li>
            </ul>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full">
              <Link href="/candidate/applications">View My Applications</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/candidate">Return to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── 3. FINAL REVIEW / CONFIRMATION MODAL ───────────────────────
  if (mode === "confirm") {
    return (
      <Card className="border border-[var(--color-border)] shadow-md animate-fade-in">
        <CardHeader className="p-6 border-b border-[var(--color-border)] bg-slate-50/50">
          <CardTitle className="text-xl font-bold text-[var(--color-foreground)]">
            Review Your Assessment Answers
          </CardTitle>
          <CardDescription className="text-xs text-[var(--color-muted-foreground)]">
            Please review your responses before final submission. Once submitted, your assessment cannot be edited.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 divide-y divide-[var(--color-border)]/60">
            {questions.map((q, idx) => {
              const ans = (answers[q.id] || "").trim();
              const isComplete = ans.length >= (q.minLength || 20);

              return (
                <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-brand)]">
                      Question {idx + 1} — {q.sectionTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setMode("form");
                      }}
                      className="text-xs text-teal-700 underline cursor-pointer hover:text-teal-900"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-foreground)]">
                    {q.questionText}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] italic bg-slate-50 p-3 rounded border border-slate-200/80 whitespace-pre-wrap">
                    {ans || "(No response entered)"}
                  </p>
                  {!isComplete && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      ⚠️ Needs more detail (min {q.minLength || 20} chars)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setMode("form")}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <ChevronLeft size={16} className="mr-1" /> Back to Edit
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 font-bold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Submitting Assessment…
                </>
              ) : (
                <>
                  Confirm & Submit Assessment <Send size={15} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── 4. QUESTION BY QUESTION FORM SCREEN ─────────────────────────
  const currentAnswer = answers[currentQ.id] || "";
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const charCount = currentAnswer.length;
  const isQuestionAnswered = charCount >= (currentQ.minLength || 20);

  return (
    <Card className="border border-[var(--color-border)] shadow-md animate-fade-in">
      {/* Top Header & Progress */}
      <CardHeader className="p-5 md:p-6 border-b border-[var(--color-border)] space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--color-brand)] uppercase tracking-wider">
              {job.title}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[var(--color-muted-foreground)]">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
            Section {currentQ.section}: {currentQ.sectionTitle}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand)] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--color-muted-foreground)]">
            <span>{answeredCount} of {questions.length} answered</span>
            <span>{progressPercent}% Complete</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-6">
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Question Header & Prompt */}
        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            Question {currentQ.questionNumber}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-foreground)] leading-snug">
            {currentQ.questionText}
          </h2>
          {currentQ.helperText && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {currentQ.helperText}
            </p>
          )}
        </div>

        {/* Answer Textarea */}
        <div className="space-y-2">
          <Textarea
            rows={7}
            placeholder={currentQ.placeholder || "Enter your detailed response here..."}
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
            className="text-sm leading-relaxed p-4 border-[var(--color-border)] focus:border-[var(--color-brand)]"
          />

          <div className="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)] px-1">
            <span>
              {charCount} characters • {wordCount} words
              {currentQ.recommendedWords && ` (Target: ~${currentQ.recommendedWords} words)`}
            </span>
            <span className={isQuestionAnswered ? "text-emerald-600 font-medium" : "text-amber-600"}>
              {isQuestionAnswered ? "✓ Minimum reached" : `Min ${currentQ.minLength || 20} characters`}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {lastSaved && <span>{lastSaved}</span>}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentQuestionIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 sm:flex-none cursor-pointer"
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </Button>
            )}

            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-none cursor-pointer font-semibold shadow-sm"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next Question <ChevronRight size={16} className="ml-1" />
                </>
              ) : (
                <>
                  Review & Submit <CheckCircle2 size={16} className="ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

