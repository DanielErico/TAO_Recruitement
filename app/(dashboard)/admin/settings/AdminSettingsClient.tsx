"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileCheck,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";

interface AdminSettingsClientProps {
  currentMode: string;
  adminName: string;
}

export function AdminSettingsClient({ currentMode, adminName }: AdminSettingsClientProps) {
  const [mode, setMode] = useState(currentMode);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isPlanA = mode === "PLAN_A";
  const isPlanB = mode === "PLAN_B";

  async function handleSwitch(targetMode: "PLAN_A" | "PLAN_B") {
    if (mode === targetMode) return;
    if (
      !confirm(
        `Switch to ${targetMode === "PLAN_A" ? "Plan A — AI Voice Interview" : "Plan B — AI-Powered Online Assessment"}?\n\nThis will immediately change which assessment pathway candidates see. Existing records are preserved.`
      )
    )
      return;

    setSwitching(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/recruitment-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: targetMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch mode");
      setMode(targetMode);
      setMessage({
        type: "success",
        text: `Switched to ${targetMode} successfully. ${
          targetMode === "PLAN_A"
            ? "Candidates will now see the AI voice interview pathway."
            : "Candidates will now see the online written assessment pathway."
        }`,
      });
      // Refresh window so that sidebar, layout, and server components reflect new mode
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to switch mode. Please try again." });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Active Mode Banner */}
      <div
        className={`p-4 rounded-xl border-2 flex items-center gap-4 ${
          isPlanB
            ? "border-teal-400 bg-teal-50/60"
            : "border-indigo-400 bg-indigo-50/60"
        }`}
      >
        {isPlanB ? (
          <FileCheck size={28} className="text-teal-600 shrink-0" />
        ) : (
          <Mic size={28} className="text-indigo-600 shrink-0" />
        )}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Currently Active Recruitment Mode
          </p>
          <p className={`text-lg font-extrabold mt-0.5 ${isPlanB ? "text-teal-700" : "text-indigo-700"}`}>
            {isPlanB ? "Plan B — AI-Powered Online Assessment" : "Plan A — AI Voice Interview"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {isPlanB
              ? "Candidates complete a written, role-tailored 6-question assessment after submitting their application."
              : "Candidates complete an AI-conducted voice interview session after submitting their application."}
          </p>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={15} className="shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}

      {/* Mode Selection Cards */}
      <Card>
        <CardHeader className="pb-3 border-b border-[var(--color-border)]">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-2">
            <Shield size={14} />
            Recruitment Assessment Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan B Card */}
          <div
            className={`p-5 rounded-xl border-2 space-y-3 transition-all ${
              isPlanB
                ? "border-teal-400 bg-teal-50/50 shadow-sm"
                : "border-[var(--color-border)] bg-white hover:border-teal-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPlanB ? "bg-teal-100" : "bg-slate-100"}`}>
                <FileCheck size={18} className={isPlanB ? "text-teal-600" : "text-slate-500"} />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--color-foreground)]">Plan B</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">AI-Powered Online Assessment</p>
              </div>
              {isPlanB && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>
            <ul className="text-xs text-[var(--color-muted-foreground)] space-y-1 pl-1">
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-teal-500 shrink-0 mt-0.5" /> Written 6-question assessment</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-teal-500 shrink-0 mt-0.5" /> Role-tailored questions per job</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-teal-500 shrink-0 mt-0.5" /> No real-time API voice dependency</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-teal-500 shrink-0 mt-0.5" /> AI evaluates CV + application + answers</li>
            </ul>
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={isPlanB || switching}
              onClick={() => handleSwitch("PLAN_B")}
            >
              {switching && !isPlanB ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
              {isPlanB ? "Currently Active" : "Activate Plan B"}
            </Button>
          </div>

          {/* Plan A Card */}
          <div
            className={`p-5 rounded-xl border-2 space-y-3 transition-all ${
              isPlanA
                ? "border-indigo-400 bg-indigo-50/50 shadow-sm"
                : "border-[var(--color-border)] bg-white hover:border-indigo-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPlanA ? "bg-indigo-100" : "bg-slate-100"}`}>
                <Mic size={18} className={isPlanA ? "text-indigo-600" : "text-slate-500"} />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--color-foreground)]">Plan A</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">AI Voice Interview</p>
              </div>
              {isPlanA && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>
            <ul className="text-xs text-[var(--color-muted-foreground)] space-y-1 pl-1">
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-indigo-500 shrink-0 mt-0.5" /> Real-time AI voice interview</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-indigo-500 shrink-0 mt-0.5" /> Dynamic conversational questions</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-indigo-500 shrink-0 mt-0.5" /> Speech transcription + AI evaluation</li>
              <li className="flex items-start gap-1.5"><CheckCircle size={11} className="text-indigo-500 shrink-0 mt-0.5" /> Requires higher Gemini API capacity</li>
            </ul>
            <Button
              size="sm"
              variant={isPlanA ? "default" : "outline"}
              className="w-full text-xs"
              disabled={isPlanA || switching}
              onClick={() => handleSwitch("PLAN_A")}
            >
              {switching && !isPlanA ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
              {isPlanA ? "Currently Active" : "Activate Plan A"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">What changes when you switch modes:</p>
          <ul className="space-y-0.5 pl-2 list-disc list-outside ml-2">
            <li>Candidate dashboard CTA and sidebar navigation update instantly.</li>
            <li>Existing application records, interview transcripts and evaluations are always preserved.</li>
            <li>Candidates mid-assessment will not be interrupted; their current journey completes normally.</li>
            <li>Mode is stored as a server cookie — it persists until changed here or the cookie expires.</li>
            <li>To make the mode permanent across server restarts, set <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_RECRUITMENT_MODE</code> in your environment.</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)] text-right">
        Signed in as admin: <strong>{adminName}</strong>
      </p>
    </div>
  );
}

