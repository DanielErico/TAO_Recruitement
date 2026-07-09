"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  { id: "applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "screening", label: "Screening", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "interview", label: "Interview", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "evaluation", label: "Evaluation", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "shortlisted", label: "Shortlisted", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "offered", label: "Offered", color: "bg-green-50 text-green-700 border-green-200" },
  { id: "rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

export default function RecruiterPipelinePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [applications, setApplications] = useState<PipelineApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchPipeline() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications/list");
      console.log("[Pipeline] fetch applications response status:", res.status);
      const data = await res.json();
      if (!res.ok) {
        console.error("[Pipeline] API error:", data.error || "Unknown error");
      }
      if (data.applications) {
        setApplications(data.applications);
      } else {
        console.warn("[Pipeline] No applications array in response:", data);
      }
    } catch (err: any) {
      console.error("[Pipeline] Failed to fetch pipeline data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPipeline();
  }, []);

  async function handleMove(appId: string, currentStatus: string, direction: "prev" | "next") {
    const currentIndex = COLUMNS.findIndex((c) => c.id === currentStatus);
    let nextIndex = currentIndex + (direction === "next" ? 1 : -1);
    
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;
    const nextStatus = COLUMNS[nextIndex].id;

    setUpdatingId(appId);
    
    // Update local state first for instant UI response
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: nextStatus } : app))
    );

    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to save status");
      }
    } catch (err) {
      console.error("Failed to update status on server, reverting:", err);
      // Revert state
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: currentStatus } : app))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[var(--color-brand)]" size={32} />
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading recruitment pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Hiring Pipeline</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Track candidates across the application stages.
          </p>
        </div>
        <Button onClick={fetchPipeline} variant="outline" size="sm" className="h-9">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Board Layout */}
      <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-thin">
        {COLUMNS.map((col) => {
          const colApps = applications.filter((app) => app.status === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 bg-[var(--color-muted)]/35 rounded-xl border border-[var(--color-border)] flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="p-3 border-b border-[var(--color-border)] bg-white rounded-t-xl flex items-center justify-between">
                <span className="font-semibold text-sm text-[var(--color-foreground)] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.id === 'rejected' ? 'bg-red-500' : col.id === 'offered' ? 'bg-green-500' : 'bg-[var(--color-brand)]'}`} />
                  {col.label}
                </span>
                <span className="text-xs font-bold text-[var(--color-muted-foreground)] px-2 py-0.5 rounded bg-[var(--color-muted)]">
                  {colApps.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[150px]">
                {colApps.length === 0 ? (
                  <div className="h-full border border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center p-6 text-center text-xs text-[var(--color-muted-foreground)]">
                    No candidates
                  </div>
                ) : (
                  colApps.map((app) => {
                    const initials = app.candidate?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "C";
                      
                    const fitScore = app.cv_analysis?.job_fit_score;

                    return (
                      <Card key={app.id} className="shadow-sm border-[var(--color-border)] hover:border-[var(--color-brand)]/50 transition-all group">
                        <CardContent className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-[var(--color-foreground)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                {app.candidate?.full_name}
                              </h4>
                              <p className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                                {app.job?.title}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                              {initials}
                            </div>
                          </div>

                          {/* Score and Date */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border)]/50">
                            {fitScore !== undefined ? (
                              <span className={`font-semibold ${
                                fitScore >= 80 ? "text-green-600" : fitScore >= 65 ? "text-amber-600" : "text-red-500"
                              }`}>
                                CV Fit: {fitScore}%
                              </span>
                            ) : (
                              <span className="text-[var(--color-muted-foreground)]">CV Fit: —</span>
                            )}
                            <span className="text-[var(--color-muted-foreground)]">
                              {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <Link
                              href={`/recruiter/applications/${app.id}`}
                              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline font-semibold"
                            >
                              <FileText size={12} /> Review Profile
                            </Link>

                            <div className="flex items-center gap-1.5">
                              {updatingId === app.id ? (
                                <Loader2 className="animate-spin text-[var(--color-muted-foreground)]" size={13} />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleMove(app.id, col.id, "prev")}
                                    disabled={col.id === COLUMNS[0].id}
                                    className="p-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] disabled:opacity-30 cursor-pointer"
                                    aria-label="Move left"
                                  >
                                    <ArrowLeft size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleMove(app.id, col.id, "next")}
                                    disabled={col.id === COLUMNS[COLUMNS.length - 1].id}
                                    className="p-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] disabled:opacity-30 cursor-pointer"
                                    aria-label="Move right"
                                  >
                                    <ArrowRight size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
