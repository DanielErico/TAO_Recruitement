import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export function getScoreColour(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function getStatusConfig(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    // Job statuses
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    published: { label: "Published", className: "bg-[var(--color-brand-light)] text-[var(--color-brand)]" },
    archived: { label: "Archived", className: "bg-amber-50 text-amber-700" },
    closed: { label: "Closed", className: "bg-red-50 text-red-600" },
    // Application statuses
    applied: { label: "Applied", className: "bg-blue-50 text-blue-700" },
    screening: { label: "Screening", className: "bg-purple-50 text-purple-700" },
    interview: { label: "Interview", className: "bg-indigo-50 text-indigo-700" },
    evaluation: { label: "Evaluation", className: "bg-orange-50 text-orange-700" },
    shortlisted: { label: "Shortlisted", className: "bg-[var(--color-brand-light)] text-[var(--color-brand)]" },
    offered: { label: "Offered", className: "bg-emerald-50 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-600" },
    withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-500" },
    // Recommendations
    highly_recommended: { label: "Highly Recommended", className: "bg-[var(--color-brand-light)] text-[var(--color-brand)] font-semibold" },
    recommended: { label: "Recommended", className: "bg-emerald-50 text-emerald-700" },
    consider: { label: "Consider", className: "bg-amber-50 text-amber-700" },
    not_recommended: { label: "Not Recommended", className: "bg-red-50 text-red-600" },
  };
  return map[status] ?? { label: capitalize(status), className: "bg-gray-100 text-gray-600" };
}
