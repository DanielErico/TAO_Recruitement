"use client";

import { useState, useTransition, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, UploadCloud, Loader2, CheckCircle2, LogIn, FileText, X } from "lucide-react";

export default function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCandidate, setIsCandidate] = useState<boolean | null>(null); // null = loading
  const [appStatus, setAppStatus] = useState<string>("screening");
  const [fitScore, setFitScore] = useState<number | null>(null);

  const [profileResumeName, setProfileResumeName] = useState<string | null>(null);
  const [profileResumeUrl, setProfileResumeUrl] = useState<string | null>(null);
  const [submittingStep, setSubmittingStep] = useState<"idle" | "uploading" | "parsing" | "analyzing" | "finalizing">("idle");

  // Check auth status and fetch profile details
  useEffect(() => {
    fetch("/api/candidate/profile")
      .then((res) => {
        if (res.status === 200) {
          setIsCandidate(true);
          return res.json();
        } else {
          setIsCandidate(false);
          return null;
        }
      })
      .then((data) => {
        if (data && data.profile) {
          setProfileResumeName(data.profile.resume_name || null);
          setProfileResumeUrl(data.profile.resume_url || null);
          if (data.profile.portfolio_url) {
            setPortfolioUrl(data.profile.portfolio_url);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading candidate profile:", err);
        setIsCandidate(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("coverLetter", coverLetter);
      formData.append("portfolioUrl", portfolioUrl);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      setSubmittingStep("uploading");
      
      const stepTimer1 = setTimeout(() => {
        setSubmittingStep("parsing");
      }, 1500);
      
      const stepTimer2 = setTimeout(() => {
        setSubmittingStep("analyzing");
      }, 3500);

      try {
        const res = await fetch("/api/applications", {
          method: "POST",
          body: formData,
        });

        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setSubmittingStep("idle");
          setError(json.error || `Submission failed (${res.status})`);
          return;
        }

        setSubmittingStep("finalizing");
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Sync real UUID back to cookie if it was a demo UUID
        if (json.realUserId) {
          document.cookie = `mock_user_id=${json.realUserId}; path=/; max-age=604800; SameSite=Lax`;
        }

        if (json.status) setAppStatus(json.status);
        if (json.fitScore) setFitScore(json.fitScore);
        setSuccess(true);
        setSubmittingStep("idle");
      } catch (err: any) {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        setSubmittingStep("idle");
        setError(err.message || "Failed to submit application");
      }
    });
  }

  const renderProgressOverlay = () => {
    if (submittingStep === "idle") return null;

    const steps = [
      { id: "uploading", label: "Uploading resume & application details" },
      { id: "parsing", label: "Parsing & extracting text from resume" },
      { id: "analyzing", label: "AI is analyzing resume match & fit score" },
      { id: "finalizing", label: "Finalizing application setup" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === submittingStep);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-[var(--color-border)] rounded-xl shadow-xl bg-white p-6 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-[var(--color-foreground)]">Processing Application</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              This will take a few seconds while our AI models evaluate your resume.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300 ${
                    isCompleted 
                      ? "bg-[var(--color-brand)] text-white border border-[var(--color-brand)]" 
                      : isActive 
                      ? "bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]" 
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}>
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span className={`text-sm transition-all duration-300 ${
                    isCompleted 
                      ? "text-[var(--color-muted-foreground)] line-through" 
                      : isActive 
                      ? "text-[var(--color-foreground)] font-semibold animate-pulse" 
                      : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                  {isActive && <Loader2 size={14} className="animate-spin text-[var(--color-brand)] ml-auto" />}
                </div>
              );
            })}
          </div>

          {/* Simple progress bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-brand)] transition-all duration-500 rounded-full"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="mb-6">
          <Image src="/logo.webp" alt="TAO" width={72} height={28} priority />
        </div>
        <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-xl p-8 space-y-6 shadow-sm">
          <div className="flex justify-center">
            <CheckCircle2 size={48} className="text-[var(--color-brand)]" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Application Submitted!</h1>
            {fitScore !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] text-xs font-semibold mx-auto mt-2">
                CV Match Score: {fitScore}%
              </div>
            )}
            <p className="text-[var(--color-muted-foreground)] text-sm pt-2">
              {appStatus === "interview" 
                ? "Excellent! Your resume matches our requirements. You have been pre-selected for the screening interview! You can start it right away."
                : "Thank you for applying. We have received your application. You will be gotten back to after proper review from the admin via email to proceed for an interview."}
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            {appStatus === "interview" && (
              <Button asChild className="w-full">
                <Link href="/candidate/interviews">Start AI Interview Now</Link>
              </Button>
            )}
            <Button asChild variant={appStatus === "interview" ? "outline" : "default"} className="w-full">
              <Link href="/candidate/applications">Go to My Applications</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in / loading
  if (isCandidate === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!isCandidate) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="mb-6">
          <Image src="/logo.webp" alt="TAO" width={72} height={28} priority />
        </div>
        <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-xl p-8 space-y-6 shadow-sm">
          <LogIn size={40} className="mx-auto text-[var(--color-brand)]" strokeWidth={1.5} />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">Sign in to Apply</h1>
            <p className="text-[var(--color-muted-foreground)] text-sm">
              You need a candidate account to submit an application.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href={`/login?next=/jobs/${jobId}/apply`}>Sign In</Link>
          </Button>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Demo: use <strong>candidate@tao.org</strong> with any password
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-12">
      {renderProgressOverlay()}
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.webp" alt="TAO" width={72} height={28} priority />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 animate-fade-in space-y-8">
        <div>
          <Link
            href={`/jobs/${jobId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-4"
          >
            <ArrowLeft size={16} /> Back to Job Details
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)] tracking-tight">
            Submit your application
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Takes about 3 minutes to complete.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[var(--color-border)] rounded-xl p-6 md:p-8 space-y-6 shadow-sm">

          {/* Resume upload */}
          <div className="space-y-1.5">
            <Label>Resume / CV</Label>
            {profileResumeName && !resumeFile ? (
              <div className="flex items-center justify-between p-3.5 border border-[var(--color-brand)] bg-[var(--color-brand-light)]/30 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded bg-[var(--color-brand)] text-white shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                      Using default resume: {profileResumeName}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Saved from your profile
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setResumeFile(file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="text-xs cursor-pointer">
                    Replace File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:bg-[var(--color-muted)] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setResumeFile(file);
                  }}
                />
                <UploadCloud size={24} className="mx-auto text-[var(--color-muted-foreground)] mb-2" />
                {resumeFile ? (
                  <p className="text-sm font-medium text-[var(--color-brand)]">{resumeFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">Click to upload or drag and drop</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">PDF, DOC, DOCX (Max. 5MB)</p>
                  </>
                )}
              </div>
            )}

            {resumeFile && profileResumeName && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setResumeFile(null)}
                  className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <X size={12} /> Use default profile resume instead
                </button>
              </div>
            )}

            <p className="text-xs text-[var(--color-muted-foreground)]">
              {profileResumeName 
                ? "Your default resume will be used if you don't upload a new one." 
                : "Note: Resume storage is optional — your application will be submitted either way."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portfolio">Portfolio / LinkedIn URL</Label>
            <Input
              id="portfolio"
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
            <Textarea
              id="coverLetter"
              rows={5}
              placeholder="Why are you a great fit for this role?"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-destructive)] bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              {isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
