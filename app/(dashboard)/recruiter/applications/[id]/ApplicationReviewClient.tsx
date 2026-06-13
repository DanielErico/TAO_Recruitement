"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Tabs are implemented inline using react state
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileText,
  Mail,
  Globe,
  Briefcase,
  TrendingUp,
  MessageSquare,
  Star,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
    };
    job: {
      id: string;
      title: string;
      description: string;
      requirements: string;
    };
  };
  cvAnalysis: any;
  interview: any;
  interviewResponses: any[];
  evaluation: any;
}

export function ApplicationReviewClient({
  application,
  cvAnalysis,
  interview,
  interviewResponses,
  evaluation,
}: ClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(evaluation?.recruiter_summary || "");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [notesSavedStatus, setNotesSavedStatus] = useState<"success" | "error" | null>(null);
  const [statusSavedStatus, setStatusSavedStatus] = useState<"error" | null>(null);
  const [activeTab, setActiveTab] = useState("cv-analysis");

  async function handleStatusChange(newStatus: string) {
    setIsSavingStatus(true);
    setStatusSavedStatus(null);
    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to save status");
      }
      setStatus(newStatus);
    } catch (err) {
      console.error(err);
      setStatusSavedStatus("error");
    } finally {
      setIsSavingStatus(false);
    }
  }

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

      if (!res.ok) {
        throw new Error("Failed to save notes");
      }
      setNotesSavedStatus("success");
      setTimeout(() => setNotesSavedStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setNotesSavedStatus("error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  // Work experience parse helper
  const workHistory = cvAnalysis?.work_experience || [];
  const educationList = cvAnalysis?.education || [];

  return (
    <div className="space-y-6">
      {/* Header */}
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

          {/* Quick Status Select */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3 bg-white p-3 border border-[var(--color-border)] rounded-lg shadow-sm">
              <span className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">
                Status:
              </span>
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

      {/* Grid: Details on Left, Sidebar info on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Review Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Tabs Navigation */}
          <div className="flex border-b border-[var(--color-border)] mb-4 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("cv-analysis")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "cv-analysis"
                  ? "bg-[var(--color-brand)] text-white shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/40"
              }`}
            >
              <FileText size={15} /> CV Analysis
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "interview"
                  ? "bg-[var(--color-brand)] text-white shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/40"
              }`}
            >
              <MessageSquare size={15} /> AI Interview
            </button>
            <button
              onClick={() => setActiveTab("evaluation")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "evaluation"
                  ? "bg-[var(--color-brand)] text-white shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/40"
              }`}
            >
              <Star size={15} /> AI Evaluation
            </button>
          </div>

          {/* TAB: CV Analysis */}
          {activeTab === "cv-analysis" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">AI CV Extraction Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Professional Summary</h4>
                    <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                      {cvAnalysis?.professional_summary || "No extraction summary available."}
                    </p>
                  </div>

                  {/* Skills tags */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Keywords & Skills Extracted</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {cvAnalysis?.skills && cvAnalysis.skills.length > 0 ? (
                        cvAnalysis.skills.map((skill: string) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded bg-[var(--color-brand-light)] text-[var(--color-brand)] text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">No skills detected.</span>
                      )}
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-green-700 flex items-center gap-1">
                        <CheckCircle size={14} /> Key Strengths
                      </h5>
                      <ul className="list-disc pl-4 text-xs text-green-800 space-y-1">
                        {cvAnalysis?.strengths?.map((str: string, i: number) => (
                          <li key={i}>{str}</li>
                        )) || <li>None noted.</li>}
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-red-700 flex items-center gap-1">
                        <XCircle size={14} /> Areas to Explore / Risks
                      </h5>
                      <ul className="list-disc pl-4 text-xs text-red-800 space-y-1">
                        {cvAnalysis?.weaknesses?.map((wk: string, i: number) => (
                          <li key={i}>{wk}</li>
                        )) || <li>None noted.</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Experience Timeline */}
                  <div className="space-y-4 pt-2">
                    <h4 className="font-semibold text-sm text-[var(--color-foreground)] flex items-center gap-1.5">
                      <Briefcase size={16} /> Work History
                    </h4>
                    {workHistory.length === 0 ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">No work experience listed.</p>
                    ) : (
                      <div className="space-y-4 pl-3 border-l-2 border-[var(--color-border)]">
                        {workHistory.map((work: any, i: number) => (
                          <div key={i} className="relative space-y-1">
                            <span className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-brand)]" />
                            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                              <span className="font-bold text-[var(--color-foreground)]">{work.title}</span>
                              <span className="text-[var(--color-muted-foreground)]">
                                {work.start_date} - {work.end_date || "Present"}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--color-brand)] font-medium">{work.company}</div>
                            <p className="text-xs text-[var(--color-muted-foreground)] pt-0.5 leading-relaxed">
                              {work.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Education */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Education</h4>
                    {educationList.length === 0 ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">No education details listed.</p>
                    ) : (
                      educationList.map((edu: any, i: number) => (
                        <div key={i} className="text-xs space-y-0.5">
                          <div className="font-bold text-[var(--color-foreground)]">{edu.degree} in {edu.field}</div>
                          <div className="text-[var(--color-muted-foreground)] flex justify-between">
                            <span>{edu.institution}</span>
                            <span>{edu.graduation_year}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB: Interview Transcript */}
          {activeTab === "interview" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">AI Screening Dialog Transcript</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(!interview || interview.status !== "completed") ? (
                    <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                      <MessageSquare size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Interview not completed yet</p>
                      <p className="text-xs">
                        {interview?.status === "in_progress" 
                          ? "Candidate is currently in the interview." 
                          : "The candidate has not started their AI screening interview invite."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        The candidate completed the interactive chat screening session. The full transcript of questions and responses is recorded below:
                      </div>
                      
                      <div className="space-y-4 pt-2 divide-y divide-[var(--color-border)]/50">
                        {interviewResponses.map((resp: any, i: number) => (
                          <div key={i} className="space-y-2 pt-4 first:pt-0">
                            <div className="bg-[var(--color-muted)]/50 border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-foreground)]">
                              <strong className="block text-[var(--color-brand)] mb-1">AI Interviewer:</strong>
                              {resp.question_text}
                            </div>
                            <div className="bg-white border border-[var(--color-border)]/75 rounded-lg p-3 text-xs text-[var(--color-foreground)] pl-4">
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

          {/* TAB: AI Evaluation */}
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
                      <p className="text-xs">AI scoring evaluation runs automatically once the candidate finishes the screening interview.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Overall badge and recommendation */}
                      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-[var(--color-brand)]/20 bg-[var(--color-brand-light)]/40 gap-4">
                        <div className="text-center sm:text-left">
                          <h4 className="font-bold text-sm text-[var(--color-foreground)]">AI Recommendation</h4>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 bg-white capitalize shadow-sm text-[var(--color-brand)]`}>
                            {evaluation.recommendation?.replace("_", " ") || "Recommended"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider">Overall Match</span>
                          <span className="text-3xl font-extrabold text-[var(--color-brand)]">{evaluation.overall_score}%</span>
                        </div>
                      </div>

                      {/* Score Breakdown List */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-[var(--color-foreground)]">Score Metrics Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: "Technical Competence", score: evaluation.technical_score, color: "bg-blue-600" },
                            { label: "Communication Skills", score: evaluation.communication_score, color: "bg-teal-600" },
                            { label: "Experience Relevance", score: evaluation.experience_score, color: "bg-indigo-600" },
                            { label: "Problem Solving Capability", score: evaluation.problem_solving_score, color: "bg-purple-600" },
                            { label: "Culture & Value Fit", score: evaluation.culture_fit_score, color: "bg-emerald-600" },
                          ].map((metric) => (
                            <div key={metric.label} className="space-y-1.5 p-3 rounded-lg border border-[var(--color-border)] bg-white">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-[var(--color-foreground)]">{metric.label}</span>
                                <span className="text-[var(--color-brand)]">{metric.score}%</span>
                              </div>
                              <div className="h-2 w-full bg-[var(--color-muted)] rounded-full overflow-hidden">
                                <div className={`h-full ${metric.color} rounded-full`} style={{ width: `${metric.score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Rationale */}
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-[var(--color-foreground)]">AI Assessment Rationale</h4>
                        <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed bg-slate-50 border border-slate-200 rounded p-3 italic">
                          {evaluation.ai_rationale || "AI-generated justification rationale."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar Info & Recruiter Notes */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[var(--color-border)]">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Candidate Info & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <Mail size={15} />
                <span className="truncate">{application.candidate.email}</span>
              </div>
              
              {application.portfolio_url && (
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-[var(--color-muted-foreground)]" />
                  <a
                    href={application.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-brand)] hover:underline flex items-center gap-0.5 truncate"
                  >
                    Portfolio / Website <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {application.resume_url ? (
                <Button asChild size="sm" className="w-full mt-2">
                  <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
                    <FileText size={14} className="mr-1.5" /> View Uploaded CV
                  </a>
                </Button>
              ) : (
                <div className="text-xs text-[var(--color-muted-foreground)] italic bg-slate-50 p-2 rounded border border-slate-200 text-center">
                  No CV uploaded (Text-only profile)
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Recruiter Review summary notes form */}
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
