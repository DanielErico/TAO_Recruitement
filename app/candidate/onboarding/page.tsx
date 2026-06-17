"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  Link2, 
  UploadCloud, 
  Loader2, 
  FileText, 
  X, 
  ArrowRight 
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Pre-populate name from cookie
  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
      return match ? decodeURIComponent(match[2]) : "";
    };
    const savedName = getCookie("mock_user_name");
    if (savedName) setFullName(savedName);
  }, []);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["pdf", "doc", "docx"].includes(ext || "")) {
        setResumeFile(file);
      } else {
        setError("Invalid file type. Please upload a PDF, DOC, or DOCX file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName.trim()) {
      setError("Full Name is required.");
      setLoading(false);
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("phone", phone);
      formData.append("location", location);
      formData.append("linkedinUrl", linkedinUrl);
      formData.append("portfolioUrl", portfolioUrl);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const res = await fetch("/api/candidate/onboarding", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit onboarding form.");
      }

      // Successful onboarding: redirect to the candidate dashboard
      // Use window.location.href to perform a hard navigation. This forces Next.js to 
      // evaluate layout cookies & route cache fresh, showing the candidate panel instead of redirecting back.
      window.location.href = "/candidate";
    } catch (err: any) {
      console.error("[Onboarding] Error submitting form:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      {/* Brand Logo */}
      <div className="mb-6 flex items-center gap-2">
        <Image src="/logo.webp" alt="TAO Recruit" width={84} height={32} priority />
      </div>

      <Card className="w-full max-w-xl shadow-md border-[var(--color-border)] bg-white">
        <CardHeader className="space-y-1.5 pb-6 text-center sm:text-left border-b border-[var(--color-border)]/60">
          <CardTitle className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-sm text-[var(--color-muted-foreground)]">
            Set up your candidate account to apply for job postings and start interviews.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Full Name & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                  <User size={13} className="text-[var(--color-brand)]" />
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                  <MapPin size={13} className="text-[var(--color-brand)]" />
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  type="text"
                  required
                  placeholder="Lagos, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                <Phone size={13} className="text-[var(--color-brand)]" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+234 900 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* LinkedIn & Portfolio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="linkedin" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                  <Link2 size={13} className="text-[var(--color-brand)]" />
                  LinkedIn URL
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portfolio" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                  <Globe size={13} className="text-[var(--color-brand)]" />
                  Portfolio / GitHub URL
                </Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://github.com/username"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Resume Upload Zone */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-foreground)]">
                <UploadCloud size={13} className="text-[var(--color-brand)]" />
                Default Resume / CV
              </Label>
              
              {!resumeFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative ${
                    dragActive 
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-light)]/40" 
                      : "border-[var(--color-border)] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <UploadCloud size={30} className="mx-auto text-[var(--color-muted-foreground)]/60 mb-2" />
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    Drag and drop your resume here, or <span className="text-[var(--color-brand)] hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    PDF, DOC, DOCX up to 5MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 border border-[var(--color-brand)] bg-[var(--color-brand-light)]/30 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded bg-[var(--color-brand)] text-white shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-[var(--color-muted-foreground)] hover:text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs font-semibold text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-4">
              <Link
                href="/login"
                className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline"
              >
                Sign in with another account
              </Link>
              <Button type="submit" disabled={loading} className="gap-1.5 shrink-0 px-6">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Saving Profile…" : "Finish Setup"}
                {!loading && <ArrowRight size={14} />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
