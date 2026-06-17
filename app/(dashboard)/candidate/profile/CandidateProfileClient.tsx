"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  Phone,
  Link2,
  Globe,
  FileText,
  Download,
  Pencil,
  X,
  Plus,
  Loader2,
  CheckCircle,
  Calendar,
  Mail,
  UploadCloud,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, getInitials } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface CandidateProfile {
  id?: string;
  user_id?: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  resume_url?: string | null;
  resume_name?: string | null;
  bio?: string | null;
  skills?: string[] | null;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_at?: string;
}

interface Props {
  userId: string;
  userProfile: UserProfile;
  candidateProfile: CandidateProfile | null;
  documents: Document[];
}

export function CandidateProfileClient({ userId, userProfile, candidateProfile, documents }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState(userProfile.full_name || "");
  const [phone, setPhone] = useState(candidateProfile?.phone || "");
  const [location, setLocation] = useState(candidateProfile?.location || "");
  const [linkedinUrl, setLinkedinUrl] = useState(candidateProfile?.linkedin_url || "");
  const [portfolioUrl, setPortfolioUrl] = useState(candidateProfile?.portfolio_url || "");
  const [bio, setBio] = useState(candidateProfile?.bio || "");
  const [skills, setSkills] = useState<string[]>(candidateProfile?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
    if (e.key === "Backspace" && skillInput === "" && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("phone", phone);
      formData.append("location", location);
      formData.append("linkedinUrl", linkedinUrl);
      formData.append("portfolioUrl", portfolioUrl);
      formData.append("bio", bio);
      skills.forEach((s) => formData.append("skills[]", s));
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const res = await fetch("/api/candidate/profile", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save profile.");

      setSuccess(true);
      setEditing(false);
      setResumeFile(null);
      setTimeout(() => setSuccess(false), 3000);

      // Reload to show updated data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(userProfile.full_name || "C A");
  const hasResume = !!candidateProfile?.resume_url;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Your candidate profile visible to recruiters
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} size="sm" className="gap-2 h-9">
            <Pencil size={14} />
            Edit Profile
          </Button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <CheckCircle size={15} />
          Profile updated successfully!
        </div>
      )}

      {/* Profile Header Card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 text-[var(--color-brand)]"
              style={{ background: "var(--color-brand-light)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">
                {userProfile.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                  <Mail size={13} />
                  {userProfile.email}
                </span>
                {candidateProfile?.location && (
                  <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                    <MapPin size={13} />
                    {candidateProfile.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Calendar size={12} />
                  Member since {formatDate(userProfile.created_at)}
                </span>
              </div>

              {/* Social links */}
              <div className="flex items-center gap-3 mt-3">
                {candidateProfile?.linkedin_url && (
                  <Link
                    href={candidateProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline font-medium"
                  >
                    <Link2 size={13} />
                    LinkedIn
                  </Link>
                )}
                {candidateProfile?.portfolio_url && (
                  <Link
                    href={candidateProfile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline font-medium"
                  >
                    <Globe size={13} />
                    Portfolio
                  </Link>
                )}
                {candidateProfile?.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    <Phone size={12} />
                    {candidateProfile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User size={16} className="text-[var(--color-brand)]" />
                About Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidateProfile?.bio ? (
                <p className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                  {candidateProfile.bio}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-muted-foreground)] italic">
                  No bio added yet.{" "}
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[var(--color-brand)] hover:underline not-italic cursor-pointer"
                  >
                    Add one
                  </button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--color-brand)]" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(candidateProfile?.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted-foreground)] italic">
                  No skills added yet.{" "}
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[var(--color-brand)] hover:underline not-italic cursor-pointer"
                  >
                    Add skills
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Resume Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText size={16} className="text-[var(--color-brand)]" />
                Resume / CV
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasResume ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
                    <div className="p-2 rounded bg-[var(--color-brand)] text-white shrink-0">
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--color-foreground)] truncate">
                        {candidateProfile?.resume_name || "Resume"}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        Current CV
                      </p>
                    </div>
                    <a
                      href={candidateProfile?.resume_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-brand)] hover:text-[var(--color-brand)]/80"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5"
                    onClick={() => setEditing(true)}
                  >
                    <UploadCloud size={13} />
                    Replace Resume
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <UploadCloud
                    size={28}
                    className="mx-auto text-[var(--color-muted-foreground)]/30"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs text-[var(--color-muted-foreground)]">No resume uploaded</p>
                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1.5 w-full"
                    onClick={() => setEditing(true)}
                  >
                    <UploadCloud size={13} />
                    Upload Resume
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Phone size={16} className="text-[var(--color-brand)]" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5 text-sm">
                <Mail size={14} className="text-[var(--color-muted-foreground)] mt-0.5 shrink-0" />
                <span className="text-[var(--color-foreground)] break-all">{userProfile.email}</span>
              </div>
              {candidateProfile?.phone ? (
                <div className="flex items-start gap-2.5 text-sm">
                  <Phone size={14} className="text-[var(--color-muted-foreground)] mt-0.5 shrink-0" />
                  <span className="text-[var(--color-foreground)]">{candidateProfile.phone}</span>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)] italic">No phone number</p>
              )}
              {candidateProfile?.location ? (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin size={14} className="text-[var(--color-muted-foreground)] mt-0.5 shrink-0" />
                  <span className="text-[var(--color-foreground)]">{candidateProfile.location}</span>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)] italic">No location set</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Edit Profile Modal ──────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditing(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">Edit Profile</h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Update your profile information
                </p>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                    <User size={12} className="text-[var(--color-brand)]" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-location" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                    <MapPin size={12} className="text-[var(--color-brand)]" />
                    Location
                  </Label>
                  <Input
                    id="edit-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lagos, Nigeria"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <Phone size={12} className="text-[var(--color-brand)]" />
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 900 000 0000"
                />
              </div>

              {/* LinkedIn & Portfolio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-linkedin" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                    <Link2 size={12} className="text-[var(--color-brand)]" />
                    LinkedIn URL
                  </Label>
                  <Input
                    id="edit-linkedin"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-portfolio" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                    <Globe size={12} className="text-[var(--color-brand)]" />
                    Portfolio URL
                  </Label>
                  <Input
                    id="edit-portfolio"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-bio" className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <User size={12} className="text-[var(--color-brand)]" />
                  About Me / Bio
                </Label>
                <Textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell recruiters a bit about yourself, your experience, and what you're looking for..."
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-[var(--color-brand)]" />
                  Skills & Expertise
                </Label>
                {/* Pills display */}
                <div className="flex flex-wrap gap-1.5 p-2.5 border border-[var(--color-border)] rounded-lg min-h-[42px] bg-white focus-within:ring-1 focus-within:ring-[var(--color-brand)] focus-within:border-[var(--color-brand)] transition-all">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--color-brand-light)] text-[var(--color-brand)]"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder={skills.length === 0 ? "Type a skill and press Enter…" : "Add more…"}
                    className="flex-1 min-w-[120px] outline-none text-xs text-[var(--color-foreground)] bg-transparent placeholder:text-[var(--color-muted-foreground)]"
                  />
                </div>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  Press Enter or comma to add each skill
                </p>
              </div>

              {/* Resume Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <UploadCloud size={12} className="text-[var(--color-brand)]" />
                  {hasResume ? "Replace Resume" : "Upload Resume"}
                </Label>
                {resumeFile ? (
                  <div className="flex items-center justify-between p-3 border border-[var(--color-brand)] bg-[var(--color-brand-light)]/20 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded bg-[var(--color-brand)] text-white shrink-0">
                        <FileText size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{resumeFile.name}</p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)]">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-lg p-5 text-center cursor-pointer hover:bg-[var(--color-muted)]/20 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setResumeFile(e.target.files[0]);
                      }}
                    />
                    <UploadCloud size={24} className="text-[var(--color-muted-foreground)]/50 mb-1.5" />
                    <p className="text-xs font-semibold text-[var(--color-foreground)]">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                      PDF, DOC, DOCX up to 5MB
                    </p>
                  </label>
                )}
              </div>

              {error && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {error}
                </p>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="gap-1.5 px-5">
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
