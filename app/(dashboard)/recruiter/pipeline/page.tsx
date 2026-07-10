"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Briefcase,
  TrendingUp,
  Clock,
} from "lucide-react";

interface PipelineApp {
  id: string;
  status: string;
  applied_at: string;
  candidate: {
    id: string;
    full_name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
  cv_analysis: {
    job_fit_score: number;
  } | null;
}

const COLUMNS = [
  {
    id: "applied",
    label: "Applied",
    accent: "#6366f1",
    bg: "from-indigo-500/10 to-indigo-500/5",
    dot: "bg-indigo-400",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "screening",
    label: "Screening",
    accent: "#8b5cf6",
    bg: "from-violet-500/10 to-violet-500/5",
    dot: "bg-violet-400",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    id: "interview",
    label: "Interview",
    accent: "#f59e0b",
    bg: "from-amber-500/10 to-amber-500/5",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    id: "evaluation",
    label: "Evaluation",
    accent: "#06b6d4",
    bg: "from-cyan-500/10 to-cyan-500/5",
    dot: "bg-cyan-400",
    badge: "bg-cyan-100 text-cyan-700",
  },
  {
    id: "shortlisted",
    label: "Shortlisted",
    accent: "#14b8a6",
    bg: "from-teal-500/10 to-teal-500/5",
    dot: "bg-teal-400",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    id: "offered",
    label: "Offered",
    accent: "#22c55e",
    bg: "from-green-500/10 to-green-500/5",
    dot: "bg-green-400",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "rejected",
    label: "Rejected",
    accent: "#ef4444",
    bg: "from-red-500/10 to-red-500/5",
    dot: "bg-red-400",
    badge: "bg-red-100 text-red-700",
  },
];

function getScoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-600", ring: "#22c55e", bg: "bg-emerald-50" };
  if (score >= 65) return { text: "text-amber-600", ring: "#f59e0b", bg: "bg-amber-50" };
  return { text: "text-red-500", ring: "#ef4444", bg: "bg-red-50" };
}

function ScoreRing({ score }: { score: number }) {
  const { text, ring, bg } = getScoreColor(score);
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className={`relative w-12 h-12 flex items-center justify-center rounded-full ${bg} shrink-0`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className={`text-[10px] font-bold ${text} relative z-10`}>{score}%</span>
    </div>
  );
}

function getInitials(name: string) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "from-indigo-500 to-violet-600",
    "from-cyan-500 to-blue-600",
    "from-teal-500 to-emerald-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-purple-500 to-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function RecruiterPipelinePage() {
  const [applications, setApplications] = useState<PipelineApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchPipeline(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/applications/list");
      const data = await res.json();
      if (data.applications) setApplications(data.applications);
    } catch (err: any) {
      console.error("[Pipeline] Failed to fetch:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPipeline();
  }, []);

  async function handleMove(appId: string, currentStatus: string, direction: "prev" | "next") {
    const currentIndex = COLUMNS.findIndex((c) => c.id === currentStatus);
    const nextIndex = currentIndex + (direction === "next" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;
    const nextStatus = COLUMNS[nextIndex].id;

    setUpdatingId(appId);
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: nextStatus } : app))
    );

    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to save status");
    } catch {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: currentStatus } : app))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const totalActive = applications.filter((a) => !["rejected"].includes(a.status)).length;
  const avgScore =
    applications.length > 0
      ? Math.round(
          applications
            .filter((a) => a.cv_analysis?.job_fit_score != null)
            .reduce((sum, a) => sum + (a.cv_analysis?.job_fit_score ?? 0), 0) /
            Math.max(1, applications.filter((a) => a.cv_analysis?.job_fit_score != null).length)
        )
      : 0;
  const inInterview = applications.filter((a) => a.status === "interview").length;
  const offered = applications.filter((a) => a.status === "offered").length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-brand)]/20" />
          <Loader2 className="animate-spin text-[var(--color-brand)] absolute inset-0 m-auto" size={24} />
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading pipeline…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            Hiring Pipeline
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Drag candidates through each stage of your hiring process.
          </p>
        </div>
        <button
          onClick={() => fetchPipeline(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-all disabled:opacity-60 cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Users,
            label: "Total Active",
            value: totalActive,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            icon: TrendingUp,
            label: "Avg. Fit Score",
            value: `${avgScore}%`,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: Clock,
            label: "In Interview",
            value: inInterview,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            icon: Briefcase,
            label: "Offered",
            value: offered,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">{stat.label}</p>
              <p className="text-lg font-bold text-[var(--color-foreground)] leading-tight">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Kanban Board ───────────────────────────────────────── */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
        {COLUMNS.map((col) => {
          const colApps = applications.filter((app) => app.status === col.id);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[272px] flex flex-col rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white shadow-sm"
              style={{ maxHeight: "calc(100vh - 310px)", minHeight: 280 }}
            >
              {/* Column Header */}
              <div
                className={`bg-gradient-to-b ${col.bg} border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${col.dot} shadow-sm`}
                    style={{ boxShadow: `0 0 6px ${col.accent}80` }}
                  />
                  <span className="text-sm font-bold text-[var(--color-foreground)]">
                    {col.label}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}
                >
                  {colApps.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-slate-50/60">
                {colApps.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] text-center p-6">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-muted)] flex items-center justify-center">
                      <Users size={14} className="text-[var(--color-muted-foreground)]" />
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">No candidates yet</p>
                  </div>
                ) : (
                  colApps.map((app) => {
                    const name = app.candidate?.full_name || "Unknown";
                    const initials = getInitials(name);
                    const avatarGradient = getAvatarColor(name);
                    const fitScore = app.cv_analysis?.job_fit_score;
                    const isUpdating = updatingId === app.id;
                    const colIndex = COLUMNS.findIndex((c) => c.id === col.id);

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[${col.accent}]/40 transition-all duration-200 group overflow-hidden`}
                      >
                        {/* Top accent bar */}
                        <div
                          className="h-0.5 w-full"
                          style={{ background: `linear-gradient(to right, ${col.accent}, ${col.accent}60)` }}
                        />

                        <div className="p-3.5 space-y-3">
                          {/* Candidate Info */}
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--color-foreground)] truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                {name}
                              </p>
                              <p className="text-[11px] text-[var(--color-muted-foreground)] truncate mt-0.5 leading-tight">
                                {app.job?.title || "—"}
                              </p>
                            </div>
                            {fitScore != null && <ScoreRing score={fitScore} />}
                          </div>

                          {/* Date + Email row */}
                          <div className="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
                            <span className="truncate">{app.candidate?.email}</span>
                            <span className="shrink-0 ml-2 font-medium">
                              {new Date(app.applied_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-[var(--color-border)]/60" />

                          {/* Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/recruiter/applications/${app.id}`}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <ExternalLink size={11} />
                              View Profile
                            </Link>

                            <div className="flex items-center gap-1">
                              {isUpdating ? (
                                <Loader2 size={13} className="animate-spin text-[var(--color-muted-foreground)]" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleMove(app.id, col.id, "prev")}
                                    disabled={colIndex === 0}
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-25 transition-all cursor-pointer"
                                    title="Move back"
                                  >
                                    <ChevronLeft size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleMove(app.id, col.id, "next")}
                                    disabled={colIndex === COLUMNS.length - 1}
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-25 transition-all cursor-pointer"
                                    title="Advance stage"
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
