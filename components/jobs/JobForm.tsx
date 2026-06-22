"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import type { Department, Job } from "@/types";

interface JobFormProps {
  job?: Partial<Job>;
  departments: Department[];
  userId: string;
  mode: "create" | "edit";
}

export function JobForm({ job, departments, userId, mode }: JobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(job?.title ?? "");
  const [departmentId, setDepartmentId] = useState(job?.department_id ?? "");
  const [employmentType, setEmploymentType] = useState(job?.employment_type ?? "full_time");
  const [experienceLevel, setExperienceLevel] = useState(job?.experience_level ?? "mid");
  const [location, setLocation] = useState(job?.location ?? "");
  const [remote, setRemote] = useState(job?.remote ?? false);
  const [salaryMin, setSalaryMin] = useState(job?.salary_min?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(job?.salary_max?.toString() ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [responsibilities, setResponsibilities] = useState(job?.responsibilities ?? "");
  const [requirements, setRequirements] = useState(job?.requirements ?? "");
  const [skills, setSkills] = useState<string[]>(job?.skills_required ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [deadline, setDeadline] = useState(job?.application_deadline ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (job?.status as "draft" | "published") ?? "draft"
  );
  const [error, setError] = useState<string | null>(null);

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function handleSubmit(e: React.FormEvent, submitStatus: "draft" | "published") {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        title,
        department_id: departmentId || null,
        employment_type: employmentType,
        experience_level: experienceLevel,
        location: location || null,
        remote,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        description,
        responsibilities,
        requirements,
        skills_required: skills,
        application_deadline: deadline || null,
        status: submitStatus,
      };

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/jobs/${job?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || `Failed to save job (${res.status})`);
        return;
      }

      // If the API resolved a different real UUID, update the cookie so future
      // requests use the correct ID and avoid FK violations
      const json = await res.json().catch(() => ({}));
      if (json.realUserId) {
        document.cookie = `mock_user_id=${json.realUserId}; path=/; max-age=604800; SameSite=Lax`;
      }

      router.push("/recruiter/jobs");
      router.refresh();
    });
  }

  const employmentTypes = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "internship", label: "Internship" },
  ];

  const experienceLevels = [
    { value: "entry", label: "Entry Level" },
    { value: "mid", label: "Mid Level" },
    { value: "senior", label: "Senior" },
    { value: "lead", label: "Lead" },
    { value: "executive", label: "Executive" },
  ];

  const selectClass =
    "h-9 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1 text-[var(--color-foreground)] cursor-pointer";

  return (
    <form className="space-y-8">
      {/* Section: Basic Info */}
      <section className="space-y-4">
        <h2 className="section-title">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              required
              placeholder="e.g. Senior Software Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select department…</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employment_type">Employment Type</Label>
            <select
              id="employment_type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)}
              className={selectClass}
            >
              {employmentTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="experience_level">Experience Level</Label>
            <select
              id="experience_level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as typeof experienceLevel)}
              className={selectClass}
            >
              {experienceLevels.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Lagos, Nigeria"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Application Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salary_min">Salary Min (₦)</Label>
            <Input
              id="salary_min"
              type="number"
              placeholder="e.g. 40000"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salary_max">Salary Max (₦)</Label>
            <Input
              id="salary_max"
              type="number"
              placeholder="e.g. 60000"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="remote"
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)] cursor-pointer"
            />
            <Label htmlFor="remote" className="cursor-pointer font-normal">
              Remote / Hybrid position
            </Label>
          </div>
        </div>
      </section>

      {/* Section: Job Details */}
      <section className="space-y-4">
        <h2 className="section-title">Job Details</h2>

        <div className="space-y-1.5">
          <Label htmlFor="description">Job Description *</Label>
          <Textarea
            id="description"
            required
            rows={5}
            placeholder="Describe the role, its purpose, and the team…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="responsibilities">Key Responsibilities</Label>
          <Textarea
            id="responsibilities"
            rows={4}
            placeholder="List the main responsibilities of this role…"
            value={responsibilities}
            onChange={(e) => setResponsibilities(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="requirements">Requirements & Qualifications</Label>
          <Textarea
            id="requirements"
            rows={4}
            placeholder="Education, experience, certifications required…"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>
      </section>

      {/* Section: Skills */}
      <section className="space-y-3">
        <h2 className="section-title">Required Skills</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a skill (e.g. React)"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addSkill}>
            <Plus size={14} /> Add
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: "var(--color-brand-light)", color: "var(--color-brand)" }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:opacity-70 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-[var(--color-destructive)] bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={(e) => handleSubmit(e, "draft")}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={isPending || !title || !description}
            onClick={(e) => handleSubmit(e, "published")}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {mode === "create" ? "Publish Job" : "Save & Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}
