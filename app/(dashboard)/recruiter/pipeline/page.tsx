"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Users,
} from "lucide-react";

interface PipelineApp {
  id: string;
  status: string;
  applied_at: string;
  candidate: { id: string; full_name: string; email: string };
  job: { id: string; title: string };
  cv_analysis: { job_fit_score: number } | null;
}

const STAGES = [
  { id: "applied",     label: "Applied" },
  { id: "screening",   label: "Screening" },
  { id: "interview",   label: "Interview" },
  { id: "evaluation",  label: "Evaluation" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "offered",     label: "Offered" },
  { id: "rejected",    label: "Rejected" },
];

function getScoreBadge(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 65) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-600 border border-red-200";
}

function getInitials(name: string) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function RecruiterPipelinePage() {
  const [applications, setApplications] = useState<PipelineApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStage, setActiveStage] = useState("screening");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchPipeline(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/applications/list");
      const data = await res.json();
      if (data.applications) setApplications(data.applications);
    } catch (err: any) {
      console.error("[Pipeline] fetch failed:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchPipeline(); }, []);

  async function handleMove(appId: string, currentStatus: string, direction: "prev" | "next") {
    const idx = STAGES.findIndex((s) => s.id === currentStatus);
    const nextIdx = idx + (direction === "next" ? 1 : -1);
    if (nextIdx < 0 || nextIdx >= STAGES.length) return;
    const nextStatus = STAGES[nextIdx].id;

    setUpdatingId(appId);
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a))
    );
    // Switch tab if we're moving out of the current view
    setActiveStage(nextStatus);

    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Server update failed");
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: currentStatus } : a))
      );
      setActiveStage(currentStatus);
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleApps = applications.filter((a) => a.status === activeStage);
  const activeIdx = STAGES.findIndex((s) => s.id === activeStage);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[var(--color-brand)]" size={28} />
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading pipeline…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Hiring Pipeline
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            {applications.length} total application{applications.length !== 1 ? "s" : ""} across all stages
          </p>
        </div>
        <button
          onClick={() => fetchPipeline(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stage Tabs ────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex overflow-x-auto border-b border-[var(--color-border)] scrollbar-none">
          {STAGES.map((stage) => {
            const count = applications.filter((a) => a.status === stage.id).length;
            const isActive = stage.id === activeStage;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "border-[var(--color-brand)] text-[var(--color-brand)] bg-[var(--color-brand-light)]/30"
                    : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-slate-50"
                }`}
              >
                {stage.label}
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Candidate List ─────────────────────── */}
        {visibleApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Users size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">No candidates here</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Move candidates into <strong>{STAGES.find((s) => s.id === activeStage)?.label}</strong> to see them here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_80px_90px_200px] gap-4 px-5 py-2.5 bg-slate-50 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
              <span>Candidate</span>
              <span>Applied For</span>
              <span>Fit Score</span>
              <span>Date</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            {visibleApps.map((app) => {
              const name = app.candidate?.full_name || "Unknown";
              const initials = getInitials(name);
              const fitScore = app.cv_analysis?.job_fit_score;
              const isUpdating = updatingId === app.id;

              return (
                <div
                  key={app.id}
                  className="grid grid-cols-[1fr_1fr_80px_90px_200px] gap-4 px-5 py-4 items-center hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Candidate */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] flex items-center justify-center text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                        {name}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                        {app.candidate?.email}
                      </p>
                    </div>
                  </div>

                  {/* Job */}
                  <p className="text-sm text-[var(--color-foreground)] truncate">
                    {app.job?.title || "—"}
                  </p>

                  {/* Fit Score */}
                  <div>
                    {fitScore != null ? (
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadge(fitScore)}`}>
                        {fitScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {new Date(app.applied_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {isUpdating ? (
                      <Loader2 size={14} className="animate-spin text-[var(--color-muted-foreground)]" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleMove(app.id, activeStage, "prev")}
                          disabled={activeIdx === 0}
                          title="Move to previous stage"
                          className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-slate-100 hover:text-[var(--color-foreground)] disabled:opacity-25 transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => handleMove(app.id, activeStage, "next")}
                          disabled={activeIdx === STAGES.length - 1}
                          title="Advance to next stage"
                          className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-slate-100 hover:text-[var(--color-foreground)] disabled:opacity-25 transition-colors cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <Link
                          href={`/recruiter/applications/${app.id}`}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-lg transition-colors shrink-0 shadow-sm"
                          title="Open Application"
                        >
                          Open Application
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
