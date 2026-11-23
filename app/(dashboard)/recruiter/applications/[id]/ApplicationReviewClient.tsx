"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileText,
  Mail,
  Globe,
  Briefcase,
  MessageSquare,
  Star,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  GraduationCap,
  Award,
  TrendingUp,
  User,
  Clock,
  Target,
  Phone,
  MapPin,
  Link2,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { isPlanB } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────

interface WorkExperience {
  job_title?: string;
  title?: string;
  company: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  responsibilities?: string[];
  description?: string;
}

interface Education {
  institution: string;
  degree: string;
  year?: string;
  field?: string;
  graduation_year?: string;
}

interface ClientProps {
  application: {
    id: string;
    status: string;
    applied_at: string;
    resume_url: string | null;
    portfolio_url: string | null;
    cover_letter: string | null;
    candidate: { 
      id: string; 
      full_name: string; 
      email: string; 
      candidate_profiles?: any;
    };
    job: { id: string; title: string; description: string; requirements: string };
  };
  /** Primary: new candidate_ai_analysis table */
  aiAnalysis: any;
  /** Legacy fallback: cv_analyses table */
  cvAnalysis: any;
  interview: any;
  interviewResponses: any[];
  evaluation: any;
}

// ── Score Color Helper ────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Good Match";
  if (score >= 50) return "Partial Match";
  return "Low Match";
}

// ── Structured Report Helpers (Universal AI Engine) ──────────

/**
 * Extracts and parses the embedded REPORT_JSON block from ai_rationale.
 * Tries multiple regex patterns for resilience against whitespace variants,
 * and falls back to scanning for a bare JSON object if delimiters are absent.
 */
function parseStructuredReport(evaluation: any): any | null {
  if (!evaluation) return null;
  const rationale: string = evaluation.ai_rationale || "";
  if (!rationale) return null;

  // Pattern 1: standard delimiters (with optional whitespace inside comment)
  const patterns = [
    /<!--\s*REPORT_JSON_START\s*-->([\s\S]*?)<!--\s*REPORT_JSON_END\s*-->/,
    /REPORT_JSON_START\s*-->([\s\S]*?)<!--\s*REPORT_JSON_END/,
  ];

  for (const pattern of patterns) {
    const match = rationale.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim();
      try {
        return JSON.parse(raw);
      } catch {
        // Try sanitizing common LLM JSON issues before giving up
        try {
          const sanitized = raw
            .replace(/,\s*([}\]])/g, "$1")   // trailing commas
            .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // unquoted keys
          return JSON.parse(sanitized);
        } catch {
          // continue to next pattern
        }
      }
    }
  }

  // Pattern 2: scan for a JSON object that contains "competencies" or "overall_assessment"
  // (handles cases where delimiters were stripped or malformed)
  const jsonObjectMatch = rationale.match(/(\{[\s\S]*"competencies"[\s\S]*\})\s*(?:<!--|$)/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[1]);
    } catch { /* silent */ }
  }

  return null;
}

/**
 * Returns the ai_rationale text with the embedded JSON block stripped out,
 * so only the human-readable prefix text is shown.
 */
function getCleanRationale(aiRationale: string): string {
  if (!aiRationale) return "";
  return aiRationale
    .replace(/<!--\s*REPORT_JSON_START\s*-->[\s\S]*?<!--\s*REPORT_JSON_END\s*-->/g, "")
    .replace(/REPORT_JSON_START\s*-->[\s\S]*?<!--\s*REPORT_JSON_END/g, "")
    .trim();
}

function getCompetencyScoreBadge(score: number) {
  if (score >= 90) return { label: "Excellent (90–100)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 75) return { label: "Strong (75–89)", color: "text-green-700 bg-green-50 border-green-200" };
  if (score >= 60) return { label: "Adequate (60–74)", color: "text-amber-700 bg-amber-50 border-amber-200" };
  if (score >= 40) return { label: "Limited (40–59)", color: "text-orange-700 bg-orange-50 border-orange-200" };
  return { label: "Insufficient (0–39)", color: "text-rose-700 bg-rose-50 border-rose-200" };
}

function getNextStepStyle(step: string) {
  if (step?.includes("physical") || step?.includes("practical")) {
    return {
      bg: "bg-emerald-50 border-emerald-300 text-emerald-800",
      badge: "bg-emerald-600 text-white",
      border: "border-emerald-500",
    };
  }
  if (step?.includes("further recruiter review")) {
    return {
      bg: "bg-[var(--color-brand-light)]/40 border-[var(--color-brand)]/30 text-[var(--color-brand)]",
      badge: "bg-[var(--color-brand)] text-white",
      border: "border-[var(--color-brand)]",
    };
  }
  if (step?.includes("Additional assessment")) {
    return {
      bg: "bg-amber-50 border-amber-300 text-amber-800",
      badge: "bg-amber-600 text-white",
      border: "border-amber-500",
    };
  }
  return {
    bg: "bg-rose-50 border-rose-300 text-rose-800",
    badge: "bg-rose-600 text-white",
    border: "border-rose-500",
  };
}

// ── Skill Tag ────────────────────────────────────────────────

function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] text-xs font-semibold border border-[var(--color-brand)]/20">
      {skill}
    </span>
  );
}

function cleanErrorMessage(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw);
  if (str.includes("503") || str.includes("demand") || str.includes("SERVICE_BUSY") || str.includes("Service Unavailable")) {
    return "AI service is temporarily busy (Code: AI_503_SERVICE_BUSY). Please retry in a moment.";
  }
  if (str.includes("429") || str.includes("quota") || str.includes("RATE_LIMITED") || str.includes("Too Many Requests")) {
    return "AI rate limit reached (Code: AI_429_RATE_LIMITED). Please retry in a few moments.";
  }
  if (str.includes("401") || str.includes("API key") || str.includes("AUTH_FAILED")) {
    return "AI authentication error (Code: AI_401_AUTH_ERROR).";
  }
  if (str.includes("ECONNREFUSED") || str.includes("fetch failed") || str.includes("NETWORK_ERROR")) {
    return "Network connection to AI engine failed (Code: AI_NETWORK_ERROR).";
  }
  const sanitized = str
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\[GoogleGenerativeAI Error\]:?/gi, "")
    .replace(/AI Analysis failed:?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (sanitized.length > 120) {
    return "AI service encountered an issue (Code: AI_SERVICE_ERROR). Please click Re-analyze.";
  }
  return sanitized || "Analysis issue encountered (Code: AI_GENERIC_ERROR).";
}

// ── Main Component ────────────────────────────────────────────

export function ApplicationReviewClient({
  application,
  aiAnalysis,
  cvAnalysis,
  interview,
  interviewResponses,
  evaluation,
}: ClientProps) {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(evaluation?.recruiter_summary || "");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [notesSavedStatus, setNotesSavedStatus] = useState<"success" | "error" | null>(null);
  const [statusSavedStatus, setStatusSavedStatus] = useState<"error" | null>(null);
  const [reanalyzeStatus, setReanalyzeStatus] = useState<"success" | "error" | null>(null);
  const [reanalyzeMessage, setReanalyzeMessage] = useState("");
  const [activeTab, setActiveTab] = useState("cv-analysis");
  const [liveAiAnalysis, setLiveAiAnalysis] = useState(aiAnalysis);
  const [liveEvaluation, setLiveEvaluation] = useState(evaluation);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Handlers for Plan B / Plan A retake and re-evaluation
  async function handleGrantRetake() {
    if (!confirm("Are you sure you want to reset this assessment? The candidate will be invited to take it fresh.")) return;
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/interviews/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, action: "retake" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset");
      setResetMessage(data.message || "Assessment reset. Candidate can now retake.");
      setStatus("interview");
      setLiveEvaluation(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setResetMessage(err.message || "Failed to reset");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleReevaluate() {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/interviews/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, action: "re-evaluate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to re-evaluate");
      setResetMessage("Evaluation re-calculated successfully.");
      if (data.evaluation) {
        setLiveEvaluation(data.evaluation);
      }
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setResetMessage(err.message || "Failed to re-evaluate");
    } finally {
      setIsResetting(false);
    }
  }

  // Resolve which data source to use
  // aiAnalysis (new table) takes priority; fall back to cvAnalysis (legacy)
  const analysis = liveAiAnalysis ?? cvAnalysis;

  // Determine analysis state
  const hasAnalysis =
    analysis &&
    (analysis.professional_summary ||
      (Array.isArray(analysis.skills) && analysis.skills.length > 0));

  const extractionFailed =
    liveAiAnalysis &&
    ["failed", "empty", "unsupported"].includes(liveAiAnalysis.extraction_status);

  // ── Status Handler ──────────────────────────────────────────

  async function handleStatusChange(newStatus: string) {
    setIsSavingStatus(true);
    setStatusSavedStatus(null);
    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to save status");
      setStatus(newStatus);
    } catch {
      setStatusSavedStatus("error");
    } finally {
      setIsSavingStatus(false);
    }
  }

  // ── Notes Handler ───────────────────────────────────────────

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingNotes(true);
    setNotesSavedStatus(null);
    try {
      const res = await fetch("/api/applications/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, recruiterSummary: notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      setNotesSavedStatus("success");
      setTimeout(() => setNotesSavedStatus(null), 3000);
    } catch {
      setNotesSavedStatus("error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  // ── Re-analyze Handler ──────────────────────────────────────

  async function handleReanalyze() {
    setIsReanalyzing(true);
    setReanalyzeStatus(null);
    setReanalyzeMessage("");
    try {
      const res = await fetch("/api/applications/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReanalyzeStatus("error");
        const msg = data.errorCode
          ? `Analysis temporarily busy (${data.errorCode}). Please retry in a few moments.`
          : cleanErrorMessage(data.error || "Re-analysis failed");
        setReanalyzeMessage(msg);
      } else {
        setReanalyzeStatus("success");
        setReanalyzeMessage(
          `Analysis complete — Score: ${data.score}/100 | Role fit: ${data.roleFit || "N/A"}`
        );
        // Reload the page after a brief delay to show fresh data
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setReanalyzeStatus("error");
      setReanalyzeMessage("Network connection issue (Code: AI_NETWORK_ERROR). Please try again.");
    } finally {
      setIsReanalyzing(false);
    }
  }

  // ── Derived data ─────────────────────────────────────────────

  const workHistory: WorkExperience[] = analysis?.work_experience || [];
  const educationList: Education[] = analysis?.education || [];
  const skills: string[] = analysis?.skills || [];
  const strengths: string[] = analysis?.strengths || [];
  const risks: string[] = analysis?.risks || analysis?.weaknesses || [];
  const certifications: string[] = analysis?.certifications || [];
  const overallScore: number = analysis?.overall_score ?? analysis?.job_fit_score ?? 0;
  const roleFit: string = analysis?.recommended_role_fit || "";
  const yearsExp: string = analysis?.years_of_experience || "";
  const professionalSummary: string = analysis?.professional_summary || "";

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <Link
          href={`/recruiter/jobs/${application.job.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to Job Applicants
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-[var(--color-brand-light)] text-[var(--color-brand)]">
              {application.candidate.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "C"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                {application.candidate.full_name}
              </h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                Applying for <strong className="text-[var(--color-foreground)]">{application.job.title}</strong>
              </p>
            </div>
          </div>

          {/* Status Select */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3 bg-white p-3 border border-[var(--color-border)] rounded-lg shadow-sm">
              <span className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">Status:</span>
              {isSavingStatus ? (
                <Loader2 className="animate-spin text-[var(--color-brand)]" size={16} />
              ) : (
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="h-8 rounded border border-[var(--color-border)] bg-white px-2 text-xs font-semibold text-[var(--color-foreground)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview Invite</option>
                  <option value="evaluation">Evaluation Run</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
            {statusSavedStatus === "error" && (
              <span className="text-[10px] text-red-500 font-medium">Failed to save status</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main Tabs ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Nav */}
          <div className="flex border-b border-[var(--color-border)] mb-4 bg-white rounded-lg p-1 shadow-sm">
            {[
              { id: "cv-analysis", icon: <FileText size={15} />, label: "CV Analysis" },
              {
                id: "interview",
                icon: isPlanB() ? <FileCheck size={15} /> : <MessageSquare size={15} />,
                label: isPlanB() ? "Online Assessment" : "AI Interview",
              },
              { id: "evaluation", icon: <Star size={15} />, label: "AI Evaluation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[var(--color-brand)] text-white shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/40"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: CV Analysis ─────────────────────────────── */}
          {activeTab === "cv-analysis" && (
            <div className="space-y-4">

              {/* Re-analyze button + status */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-bold text-[var(--color-foreground)]">AI CV Analysis</h2>
                <div className="flex items-center gap-2">
                  {reanalyzeStatus === "success" && (
                    <span className="text-xs text-emerald-600 font-medium">{reanalyzeMessage}</span>
                  )}
                  {reanalyzeStatus === "error" && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                      {reanalyzeMessage}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReanalyze}
                    disabled={isReanalyzing || !application.resume_url}
                    className="flex items-center gap-1.5 text-xs"
                    title={!application.resume_url ? "No CV uploaded" : "Re-run AI analysis on the uploaded CV"}
                  >
                    {isReanalyzing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isReanalyzing ? "Analyzing…" : "Re-analyze CV"}
                  </Button>
                </div>
              </div>

              {/* Extraction error state */}
              {extractionFailed && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">CV Extraction Issue</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {cleanErrorMessage(liveAiAnalysis?.extraction_error) || "Unable to extract CV content. Please check the uploaded file."}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Click "Re-analyze CV" to retry, or ask the candidate to re-upload their CV.
                    </p>
                  </div>
                </div>
              )}

              {/* No analysis state */}
              {!hasAnalysis && !extractionFailed && (
                <div className="p-8 text-center rounded-lg bg-[var(--color-muted)]/30 border border-[var(--color-border)]">
                  <FileText size={32} className="mx-auto text-[var(--color-muted-foreground)]/40 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">No CV Analysis Available</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1 mb-4">
                    {application.resume_url
                      ? "Click Re-analyze CV to run AI analysis on the uploaded CV."
                      : "The candidate has not uploaded a CV for this application."}
                  </p>
                  {application.resume_url && (
                    <Button size="sm" onClick={handleReanalyze} disabled={isReanalyzing}>
                      {isReanalyzing ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshCw size={12} className="mr-1.5" />}
                      Run AI Analysis
                    </Button>
                  )}
                </div>
              )}

              {/* ── Analysis Results ──────────────────────────── */}
              {hasAnalysis && (
                <div className="space-y-4">

                  {/* Score + Role Fit Banner */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${getScoreBg(overallScore)}`}>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-4xl font-extrabold ${getScoreColor(overallScore)}`}>
                          {overallScore}
                        </div>
                        <div className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">/ 100</div>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[var(--color-foreground)]">
                          {getScoreLabel(overallScore)}
                        </div>
                        {yearsExp && (
                          <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] mt-0.5">
                            <Clock size={11} /> {yearsExp} experience
                          </div>
                        )}
                      </div>
                    </div>
                    {roleFit && (
                      <div className="flex items-center gap-2 bg-white/70 border border-current/20 rounded-full px-3 py-1.5">
                        <Target size={13} className={getScoreColor(overallScore)} />
                        <span className={`text-xs font-bold ${getScoreColor(overallScore)}`}>
                          Recommended: {roleFit}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Professional Summary */}
                  {professionalSummary && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <User size={14} className="text-[var(--color-brand)]" />
                          Professional Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                          {professionalSummary}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-[var(--color-brand)]" />
                          Skills & Technologies
                          <span className="ml-auto text-xs font-normal text-[var(--color-muted-foreground)]">
                            {skills.length} extracted
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((skill) => (
                            <SkillTag key={skill} skill={skill} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Strengths & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle size={13} /> Key Strengths
                      </h5>
                      {strengths.length > 0 ? (
                        <ul className="space-y-1.5">
                          {strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-800">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-emerald-700">None identified.</p>
                      )}
                    </div>

                    {/* Risks */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Areas to Explore / Risks
                      </h5>
                      {risks.length > 0 ? (
                        <ul className="space-y-1.5">
                          {risks.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-amber-700">No significant concerns identified.</p>
                      )}
                    </div>
                  </div>

                  {/* Work History */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Briefcase size={14} className="text-[var(--color-brand)]" />
                        Work History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {workHistory.length === 0 ? (
                        <p className="text-xs text-[var(--color-muted-foreground)]">No work experience extracted.</p>
                      ) : (
                        <div className="space-y-5 pl-3 border-l-2 border-[var(--color-brand)]/20">
                          {workHistory.map((work, i) => {
                            const title = work.job_title || work.title || "";
                            const duration = work.duration || `${work.start_date || ""} – ${work.end_date || "Present"}`;
                            const responsibilities = Array.isArray(work.responsibilities)
                              ? work.responsibilities
                              : work.description
                              ? [work.description]
                              : [];
                            return (
                              <div key={i} className="relative space-y-1.5 pb-4 last:pb-0">
                                <span className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-brand)] border-2 border-white shadow-sm" />
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <span className="font-bold text-sm text-[var(--color-foreground)]">{title}</span>
                                  {duration && (
                                    <span className="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)]/50 px-2 py-0.5 rounded">
                                      {duration}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-[var(--color-brand)]">{work.company}</div>
                                {responsibilities.length > 0 && (
                                  <ul className="space-y-1 mt-1.5">
                                    {responsibilities.slice(0, 4).map((resp, j) => (
                                      <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--color-muted-foreground)]/40 shrink-0" />
                                        {resp}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Education */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-[var(--color-brand)]" />
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {educationList.length === 0 ? (
                        <p className="text-xs text-[var(--color-muted-foreground)]">No education details extracted.</p>
                      ) : (
                        <div className="space-y-3">
                          {educationList.map((edu, i) => {
                            const year = edu.year || edu.graduation_year || "";
                            const field = edu.field || "";
                            return (
                              <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[var(--color-muted)]/30 border border-[var(--color-border)]">
                                <div>
                                  <div className="font-bold text-sm text-[var(--color-foreground)]">
                                    {edu.degree}{field ? ` in ${field}` : ""}
                                  </div>
                                  <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                                    {edu.institution}
                                  </div>
                                </div>
                                {year && (
                                  <span className="text-xs text-[var(--color-muted-foreground)] bg-white border border-[var(--color-border)] px-2 py-0.5 rounded shrink-0">
                                    {year}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Certifications */}
                  {certifications.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <Award size={14} className="text-[var(--color-brand)]" />
                          Certifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {certifications.map((cert, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Assessment Responses / Interview Transcript ─ */}
          {activeTab === "interview" && (() => {
            const isOnlineAssessment =
              isPlanB() || interviewResponses.some((r: any) => r.question_text?.includes("Section"));

            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <CardTitle className="text-base font-bold">
                        {isOnlineAssessment
                          ? "Online Recruitment Assessment Responses"
                          : "AI Screening Dialog Transcript"}
                      </CardTitle>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {isOnlineAssessment
                          ? "Position-tailored written assessment responses submitted by the applicant."
                          : "Full verbatim transcript of the automated screening interview session."}
                      </p>
                    </div>
                    {interview?.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGrantRetake}
                        disabled={isResetting}
                        className="text-xs flex items-center gap-1.5"
                      >
                        {isResetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Allow Retake
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {!interview || interview.status !== "completed" ? (
                      <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                        {isOnlineAssessment ? (
                          <FileCheck size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                        ) : (
                          <MessageSquare size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                        )}
                        <p className="text-sm font-medium text-[var(--color-foreground)]">
                          {isOnlineAssessment ? "Assessment not submitted yet" : "Interview not completed yet"}
                        </p>
                        <p className="text-xs">
                          {isOnlineAssessment
                            ? "Candidate has not submitted their written online assessment."
                            : interview?.status === "in_progress"
                            ? "Candidate is currently in the interview."
                            : "The candidate has not started their AI screening interview."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-900 font-medium flex items-center justify-between">
                          <span>
                            {isOnlineAssessment
                              ? `Submitted ${interviewResponses.length} assessment answers for recruiter review:`
                              : "Full transcript of the AI screening interview session:"}
                          </span>
                          <span className="text-[11px] text-teal-700">
                            Completed: {interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : "Yes"}
                          </span>
                        </div>
                        <div className="space-y-4 divide-y divide-[var(--color-border)]/50">
                          {interviewResponses.map((resp: any, i: number) => (
                            <div key={i} className="space-y-2 pt-4 first:pt-0">
                              <div className="bg-[var(--color-muted)]/50 border border-[var(--color-border)] rounded-lg p-3 text-xs">
                                <strong className="block text-[var(--color-brand)] mb-1">
                                  {isOnlineAssessment ? `Question ${i + 1}:` : "AI Interviewer:"}
                                </strong>
                                {resp.question_text}
                              </div>
                              <div className="bg-white border border-[var(--color-border)]/75 rounded-lg p-3 text-xs pl-4">
                                <strong className="block text-slate-700 mb-1">
                                  Candidate Response:
                                </strong>
                                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                                  {resp.response_text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* ── TAB: AI Evaluation ───────────────────────────── */}
          {activeTab === "evaluation" && (() => {
            const currentEval = liveEvaluation || evaluation;
            const parsedReport = parseStructuredReport(currentEval);
            const cleanRationale = getCleanRationale(currentEval?.ai_rationale || "");
            const isFlaggedTabSwitch =
              currentEval?.recruiter_summary?.includes("Tab switching") ||
              currentEval?.ai_rationale?.includes("FLAGGED EVENT") ||
              currentEval?.ai_rationale?.includes("switch browser tabs");

            if (!currentEval) {
              return (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-bold">AI Scoring & Recruiter Report</CardTitle>
                    </CardHeader>
                    <CardContent className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                      <Star size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Evaluation not generated yet</p>
                      <p className="text-xs">The Universal AI Evaluation Engine compiles the recruiter report once the candidate completes their assessment or interview.</p>
                      <div className="pt-3">
                        <Button
                          size="sm"
                          onClick={handleReevaluate}
                          disabled={isResetting || !interview || interview.status !== "completed"}
                          className="text-xs"
                        >
                          {isResetting ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshCw size={12} className="mr-1.5" />}
                          Trigger AI Evaluation Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            if (parsedReport) {
              const nextStepStyle = getNextStepStyle(parsedReport.recommended_next_step);
              const overallBadge = getCompetencyScoreBadge(parsedReport.overall_assessment?.weighted_score ?? currentEval.overall_score);

              return (
                <div className="space-y-6">
                  {/* Recruiter Action & Status Toolbar */}
                  <div className="flex items-center justify-between gap-3 p-3 bg-white border border-[var(--color-border)] rounded-xl shadow-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-foreground)]">Evaluation Actions:</span>
                      {resetMessage && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {resetMessage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReevaluate}
                        disabled={isResetting}
                        className="text-xs flex items-center gap-1.5"
                        title="Re-run AI evaluation on candidate's answers and CV"
                      >
                        {isResetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Re-evaluate Responses
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGrantRetake}
                        disabled={isResetting}
                        className="text-xs flex items-center gap-1.5 text-amber-700 hover:text-amber-800"
                        title="Reset assessment so candidate can retake"
                      >
                        <RotateCcw size={12} /> Allow Retake
                      </Button>
                    </div>
                  </div>

                  {/* Anti-cheat tab switch warning banner (if flagged) */}
                  {isFlaggedTabSwitch && (
                    <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-rose-900">Anti-Cheat Alert: Tab Switching Detected</h4>
                          <p className="text-xs text-rose-800 mt-0.5">
                            Candidate attempted to switch browser tabs during a voice session. In Plan B online assessments, this flag can be cleared by clicking &quot;Re-evaluate Responses&quot; or &quot;Allow Retake&quot;.
                          </p>
                          <p className="text-[11px] text-rose-700 mt-1 font-medium">
                            AI baseline competency score before penalty: <strong>{parsedReport.overall_assessment?.weighted_score ?? 50}%</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleGrantRetake}
                          disabled={isResetting}
                          className="text-xs flex items-center gap-1.5"
                        >
                          {isResetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Grant Retake
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Recommended Next Step & Overall Score Banner */}
                  <div className={`p-5 rounded-xl border-2 ${nextStepStyle.border} ${nextStepStyle.bg} shadow-sm space-y-4`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                          Recommended Next Step (Recruiter Advisory)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${nextStepStyle.badge}`}>
                            {parsedReport.recommended_next_step}
                          </span>
                        </div>
                        <p className="text-xs opacity-80 pt-1">
                          Advisory recommendation for human recruitment review. AI does not make autonomous hiring decisions.
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-black/5 shadow-sm min-w-36 text-center sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                          Weighted Evaluation Score
                        </span>
                        <div className="text-3xl font-extrabold text-[var(--color-foreground)]">
                          {parsedReport.overall_assessment?.weighted_score ?? currentEval.overall_score}%
                        </div>
                        <span className={`text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full border ${overallBadge.color}`}>
                          {overallBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Review Flags (Section 9) */}
                  {Array.isArray(parsedReport.recruiter_review_flags) && parsedReport.recruiter_review_flags.length > 0 && (
                    <Card className="border-amber-300 bg-amber-50/50 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-600" />
                          Recruiter Review Flags — Verification Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-5 pb-4">
                        <ul className="space-y-1.5 text-xs text-amber-950">
                          {parsedReport.recruiter_review_flags.map((flag: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold mt-0.5">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Interview Summary Overview (Section 9) */}
                  <Card>
                    <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Interview Summary & Role Comprehension
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/60 space-y-1">
                        <strong className="text-[var(--color-foreground)] block">Interview Overview:</strong>
                        <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                          {parsedReport.interview_summary?.summary}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/60 space-y-1">
                        <strong className="text-[var(--color-foreground)] block">Role Understanding:</strong>
                        <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                          {parsedReport.interview_summary?.role_understanding}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/60 space-y-1">
                        <strong className="text-[var(--color-foreground)] block">General Response Quality:</strong>
                        <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                          {parsedReport.interview_summary?.response_quality}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/60 space-y-1">
                        <strong className="text-[var(--color-foreground)] block">Relevant Experience Demonstrated:</strong>
                        <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                          {parsedReport.interview_summary?.experience_demonstrated}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Core Competencies Assessment (Section 6 & 9) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                        Role Competency Assessment ({parsedReport.competencies?.length || 0} Evaluated)
                      </h3>
                      <span className="text-xs text-[var(--color-muted-foreground)]">Scored on 0–100 Scale</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {parsedReport.competencies?.map((comp: any, idx: number) => {
                        const badge = getCompetencyScoreBadge(comp.score);
                        return (
                          <Card key={idx} className="border border-[var(--color-border)] shadow-sm">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]/60">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-[var(--color-foreground)]">
                                    {comp.name}
                                  </span>
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {comp.weight}% Weight
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                                    {comp.score}/100 • {badge.label.split(" ")[0]}
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--color-brand)] rounded-full transition-all"
                                  style={{ width: `${comp.score}%` }}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                                <div className="space-y-1">
                                  <strong className="text-[var(--color-brand)] block">Supporting Evidence:</strong>
                                  <p className="text-[var(--color-muted-foreground)] leading-relaxed italic bg-slate-50/70 p-2.5 rounded border border-slate-100">
                                    &ldquo;{comp.evidence}&rdquo;
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <div>
                                    <strong className="text-emerald-700">Strengths: </strong>
                                    <span className="text-[var(--color-muted-foreground)]">{comp.strengths}</span>
                                  </div>
                                  <div>
                                    <strong className="text-amber-700">Development Areas: </strong>
                                    <span className="text-[var(--color-muted-foreground)]">{comp.development_areas}</span>
                                  </div>
                                  {comp.observations && (
                                    <div>
                                      <strong className="text-slate-700">Recruiter Notes: </strong>
                                      <span className="text-[var(--color-muted-foreground)]">{comp.observations}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Overall Assessment Details (Section 9) */}
                  <Card>
                    <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Overall Assessment Synthesis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1">
                          <strong className="text-emerald-800 block font-semibold">Strongest Demonstrated Competencies:</strong>
                          <p className="text-emerald-950">
                            {parsedReport.overall_assessment?.strongest_competencies?.join(", ") || "General competence"}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-1">
                          <strong className="text-amber-800 block font-semibold">Weakest Demonstrated Competencies:</strong>
                          <p className="text-amber-950">
                            {parsedReport.overall_assessment?.weakest_competencies?.join(", ") || "None flagged"}
                          </p>
                        </div>
                      </div>

                      {parsedReport.overall_assessment?.observations && (
                        <div className="pt-2">
                          <strong className="block text-[var(--color-foreground)] mb-0.5">Important Recruiter Observations:</strong>
                          <p className="text-[var(--color-muted-foreground)] leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                            {parsedReport.overall_assessment.observations}
                          </p>
                        </div>
                      )}

                      {parsedReport.overall_assessment?.areas_requiring_verification && (
                        <div className="pt-1">
                          <strong className="block text-[var(--color-foreground)] mb-0.5">Areas Requiring Further Verification:</strong>
                          <p className="text-[var(--color-muted-foreground)] leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                            {parsedReport.overall_assessment.areas_requiring_verification}
                          </p>
                        </div>
                      )}

                      {cleanRationale && (
                        <div className="pt-1">
                          <strong className="block text-[var(--color-foreground)] mb-0.5">AI Scoring Rationale:</strong>
                          <p className="text-[var(--color-muted-foreground)] leading-relaxed italic bg-slate-50 p-2.5 rounded border border-slate-200">
                            {cleanRationale}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // Fallback for older/legacy evaluations without a successfully-parsed structured JSON block.
            // Use currentEval (liveEvaluation || evaluation prop) for all data access.
            // If flat scores are all 0 (e.g. tab-switch penalty) but the rationale has embedded
            // competency data, derive a display score from the rationale's weighted_score.
            const legacyScore = currentEval.overall_score ?? 0;
            const derivedScore = legacyScore === 0
              ? (() => {
                  const m = (currentEval.ai_rationale || "").match(/"weighted_score"\s*:\s*(\d+)/);
                  return m ? parseInt(m[1], 10) : 0;
                })()
              : legacyScore;

            const flatScores = [
              { label: "Technical Competence", score: currentEval.technical_score ?? 0, color: "bg-blue-600" },
              { label: "Communication Skills", score: currentEval.communication_score ?? 0, color: "bg-teal-600" },
              { label: "Experience Relevance", score: currentEval.experience_score ?? 0, color: "bg-indigo-600" },
              { label: "Problem Solving", score: currentEval.problem_solving_score ?? 0, color: "bg-purple-600" },
              { label: "Culture & Value Fit", score: currentEval.culture_fit_score ?? 0, color: "bg-emerald-600" },
            ];
            // Check if all flat scores are 0 — if so, show a notice rather than a meaningless 0% grid
            const allZero = flatScores.every((s) => s.score === 0);

            return (
              <div className="space-y-4">
                {/* Recruiter Action Toolbar — also available in legacy mode */}
                <div className="flex items-center justify-between gap-3 p-3 bg-white border border-[var(--color-border)] rounded-xl shadow-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-foreground)]">Evaluation Actions:</span>
                    {resetMessage && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {resetMessage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReevaluate}
                      disabled={isResetting}
                      className="text-xs flex items-center gap-1.5"
                      title="Re-run AI evaluation on candidate's answers and CV"
                    >
                      {isResetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Re-evaluate Responses
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGrantRetake}
                      disabled={isResetting}
                      className="text-xs flex items-center gap-1.5 text-amber-700 hover:text-amber-800"
                      title="Reset assessment so candidate can retake"
                    >
                      <RotateCcw size={12} /> Allow Retake
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">AI Scoring & Rationale</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recommendation + Overall Score Banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-[var(--color-brand)]/20 bg-[var(--color-brand-light)]/40 gap-4">
                      <div className="text-center sm:text-left">
                        <h4 className="font-bold text-sm text-[var(--color-foreground)]">AI Recommendation</h4>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 bg-white capitalize shadow-sm text-[var(--color-brand)]">
                          {currentEval.recommendation?.replace("_", " ") || "Recommended"}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider">Overall Match</span>
                        <span className={`text-3xl font-extrabold ${getScoreColor(derivedScore)}`}>{derivedScore}%</span>
                        {derivedScore !== legacyScore && legacyScore === 0 && (
                          <span className="text-[10px] text-amber-600 mt-0.5">Score derived from evaluation report</span>
                        )}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {allZero ? (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle size={13} className="shrink-0" />
                          Legacy flat scores are unavailable for this evaluation (possibly overridden by a tab-switch penalty or pre-dating the current engine).
                          Click <strong>Re-evaluate Responses</strong> above to generate a fresh structured report.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Score Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {flatScores.map((metric) => (
                            <div key={metric.label} className="space-y-1.5 p-3 rounded-lg border border-[var(--color-border)] bg-white">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-[var(--color-foreground)]">{metric.label}</span>
                                <span className="text-[var(--color-brand)]">{metric.score}%</span>
                              </div>
                              <div className="h-2 w-full bg-[var(--color-muted)] rounded-full overflow-hidden">
                                <div className={`h-full ${metric.color} rounded-full transition-all`} style={{ width: `${metric.score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clean rationale — JSON block stripped */}
                    {cleanRationale && (
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-[var(--color-foreground)]">AI Assessment Rationale</h4>
                        <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed bg-slate-50 border border-slate-200 rounded p-3 italic">
                          {cleanRationale}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader className="pb-3 border-b border-[var(--color-border)]">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Candidate Info & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              {/* Email */}
              <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <Mail size={15} className="shrink-0" />
                <span className="truncate" title={application.candidate.email}>{application.candidate.email}</span>
              </div>

              {/* Phone */}
              {(() => {
                const profile = Array.isArray(application.candidate.candidate_profiles)
                  ? application.candidate.candidate_profiles[0]
                  : application.candidate.candidate_profiles;
                return (
                  <>
                    {profile?.phone && (
                      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                        <Phone size={15} className="shrink-0" />
                        <span>{profile.phone}</span>
                      </div>
                    )}

                    {/* Location */}
                    {profile?.location && (
                      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                        <MapPin size={15} className="shrink-0" />
                        <span>{profile.location}</span>
                      </div>
                    )}

                    {/* LinkedIn Profile */}
                    {profile?.linkedin_url && (
                      <div className="flex items-center gap-2">
                        <Link2 size={15} className="text-[var(--color-muted-foreground)] shrink-0" />
                        <a
                          href={profile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-brand)] hover:underline flex items-center gap-0.5 truncate text-xs font-semibold"
                        >
                          LinkedIn Profile <ExternalLink size={9} />
                        </a>
                      </div>
                    )}

                    {/* Portfolio / Website */}
                    {(application.portfolio_url || profile?.portfolio_url) && (
                      <div className="flex items-center gap-2">
                        <Globe size={15} className="text-[var(--color-muted-foreground)] shrink-0" />
                        <a
                          href={application.portfolio_url || profile?.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-brand)] hover:underline flex items-center gap-0.5 truncate text-xs font-semibold"
                        >
                          Portfolio / Website <ExternalLink size={9} />
                        </a>
                      </div>
                    )}

                    {/* Resume / CV view button */}
                    {(application.resume_url || profile?.resume_url) ? (
                      <Button asChild size="sm" className="w-full mt-2 cursor-pointer">
                        <a href={application.resume_url || profile?.resume_url} target="_blank" rel="noopener noreferrer">
                          <FileText size={14} className="mr-1.5" /> 
                          {application.resume_url ? "View Uploaded CV" : "View Profile default CV"}
                        </a>
                      </Button>
                    ) : (
                      <div className="text-xs text-[var(--color-muted-foreground)] italic bg-slate-50 p-2 rounded border border-slate-200 text-center">
                        No CV uploaded
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Cover Letter */}
          <Card>
            <CardHeader className="pb-3 border-b border-[var(--color-border)]">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Cover Letter
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-[var(--color-muted-foreground)] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {application.cover_letter || "No cover letter provided."}
            </CardContent>
          </Card>

          {/* Recruiter Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Recruiter Screening Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotes} className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add evaluation comments, notes from phone screenings, or interview recommendations..."
                  rows={4}
                  className="text-xs resize-none"
                />
                {notesSavedStatus === "success" && (
                  <p className="text-[11px] font-semibold text-green-600">Notes saved successfully!</p>
                )}
                {notesSavedStatus === "error" && (
                  <p className="text-[11px] font-semibold text-red-600">Failed to save notes. Try again.</p>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={isSavingNotes}>
                  {isSavingNotes && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Save Recruiter Notes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
