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
} from "lucide-react";

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

// ── Skill Tag ────────────────────────────────────────────────

function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] text-xs font-semibold border border-[var(--color-brand)]/20">
      {skill}
    </span>
  );
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
        setReanalyzeMessage(data.error || "Re-analysis failed");
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
      setReanalyzeMessage("Network error — please try again.");
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
              { id: "interview", icon: <MessageSquare size={15} />, label: "AI Interview" },
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
                    <span className="text-xs text-red-500 font-medium">{reanalyzeMessage}</span>
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
                      {liveAiAnalysis?.extraction_error || "Unable to extract CV content. Please check the uploaded file."}
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

          {/* ── TAB: Interview Transcript ────────────────────── */}
          {activeTab === "interview" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">AI Screening Dialog Transcript</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!interview || interview.status !== "completed" ? (
                    <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                      <MessageSquare size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Interview not completed yet</p>
                      <p className="text-xs">
                        {interview?.status === "in_progress"
                          ? "Candidate is currently in the interview."
                          : "The candidate has not started their AI screening interview."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        Full transcript of the AI screening interview session:
                      </div>
                      <div className="space-y-4 divide-y divide-[var(--color-border)]/50">
                        {interviewResponses.map((resp: any, i: number) => (
                          <div key={i} className="space-y-2 pt-4 first:pt-0">
                            <div className="bg-[var(--color-muted)]/50 border border-[var(--color-border)] rounded-lg p-3 text-xs">
                              <strong className="block text-[var(--color-brand)] mb-1">AI Interviewer:</strong>
                              {resp.question_text}
                            </div>
                            <div className="bg-white border border-[var(--color-border)]/75 rounded-lg p-3 text-xs pl-4">
                              <strong className="block text-slate-700 mb-1">Candidate Response:</strong>
                              {resp.response_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB: AI Evaluation ───────────────────────────── */}
          {activeTab === "evaluation" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">AI Scoring & Rationale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!evaluation ? (
                    <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                      <Star size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Evaluation not generated yet</p>
                      <p className="text-xs">AI evaluation runs automatically once the candidate finishes the screening interview.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-[var(--color-brand)]/20 bg-[var(--color-brand-light)]/40 gap-4">
                        <div className="text-center sm:text-left">
                          <h4 className="font-bold text-sm text-[var(--color-foreground)]">AI Recommendation</h4>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 bg-white capitalize shadow-sm text-[var(--color-brand)]">
                            {evaluation.recommendation?.replace("_", " ") || "Recommended"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider">Overall Match</span>
                          <span className="text-3xl font-extrabold text-[var(--color-brand)]">{evaluation.overall_score}%</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Score Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: "Technical Competence", score: evaluation.technical_score, color: "bg-blue-600" },
                            { label: "Communication Skills", score: evaluation.communication_score, color: "bg-teal-600" },
                            { label: "Experience Relevance", score: evaluation.experience_score, color: "bg-indigo-600" },
                            { label: "Problem Solving", score: evaluation.problem_solving_score, color: "bg-purple-600" },
                            { label: "Culture & Value Fit", score: evaluation.culture_fit_score, color: "bg-emerald-600" },
                          ].map((metric) => (
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

                      {evaluation.ai_rationale && (
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-[var(--color-foreground)]">AI Assessment Rationale</h4>
                          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed bg-slate-50 border border-slate-200 rounded p-3 italic">
                            {evaluation.ai_rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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
