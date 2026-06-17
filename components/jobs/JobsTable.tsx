"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusConfig } from "@/lib/utils";
import { Trash2, Users, Loader2, AlertTriangle, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "@/types";

interface JobsTableProps {
  initialJobs: (Job & { department: { name: string } | null })[];
}

export function JobsTable({ initialJobs }: JobsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [jobs, setJobs] = useState(initialJobs);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSingleDeleting, setIsSingleDeleting] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);

  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Synchronize local state if initialJobs changes
  if (initialJobs.length !== jobs.length && !isSingleDeleting && !isBulkDeleting) {
    setJobs(initialJobs);
  }

  // Row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(jobs.map((j) => j.id));
    } else {
      setSelectedIds([]);
      setIsBulkConfirming(false);
    }
  };

  const handleSelectRow = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, jobId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== jobId));
      if (selectedIds.length <= 1) {
        setIsBulkConfirming(false);
      }
    }
  };

  // Single Delete
  const handleSingleDelete = async (jobId: string) => {
    setIsSingleDeleting(true);
    setSingleError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/delete`, {
        method: "POST",
      });

      if (res.ok) {
        setJobs(jobs.filter((j) => j.id !== jobId));
        setSelectedIds(selectedIds.filter((id) => id !== jobId));
        setDeletingId(null);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        setSingleError(json.error || "Failed to delete job.");
      }
    } catch (err) {
      setSingleError("An error occurred.");
    } finally {
      setIsSingleDeleting(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setJobs(jobs.filter((j) => !selectedIds.includes(j.id)));
        setSelectedIds([]);
        setIsBulkConfirming(false);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        setBulkError(json.error || "Failed to delete selected jobs.");
      }
    } catch (err) {
      setBulkError("An error occurred during bulk deletion.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const typeLabels: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
  };

  return (
    <div className="relative">
      <div className="rounded-lg border border-[var(--color-border)] bg-white overflow-hidden shadow-sm">
        <table className="data-table w-full text-left">
          <thead className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  checked={jobs.length > 0 && selectedIds.length === jobs.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)] cursor-pointer"
                />
              </th>
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Deadline</th>
              <th className="px-5 py-3">Applicants</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {jobs.map((job) => {
              const isSelected = selectedIds.includes(job.id);
              const statusCfg = getStatusConfig(job.status);

              return (
                <tr
                  key={job.id}
                  className={`hover:bg-[var(--color-muted)]/10 transition-colors ${
                    isSelected ? "bg-[var(--color-brand-light)]/10" : ""
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectRow(job.id, e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)] cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/recruiter/jobs/${job.id}`}
                      className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-brand)] transition-colors"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                    {job.department?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                    {typeLabels[job.employment_type] ?? job.employment_type}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                    {job.application_deadline
                      ? formatDate(job.application_deadline)
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                      <Users size={13} />
                      {job.applicant_count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {deletingId === job.id ? (
                      <div className="flex items-center gap-1.5 justify-end animate-fade-in">
                        <span className="text-[10px] text-red-600 font-medium whitespace-nowrap">Confirm?</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isSingleDeleting}
                          onClick={() => handleSingleDelete(job.id)}
                          className="h-7 w-7 p-0 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          {isSingleDeleting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSingleDeleting}
                          onClick={() => setDeletingId(null)}
                          className="h-7 w-7 p-0 flex items-center justify-center border border-[var(--color-border)] rounded text-gray-500 hover:text-gray-800"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(job.id)}
                          className="h-8 w-8 p-0 flex items-center justify-center text-[var(--color-destructive)] hover:bg-red-50 hover:text-red-700 rounded-md"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {singleError && (
        <div className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md animate-fade-in">
          {singleError}
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 70, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 70, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-50 bg-[#023823] text-white border border-[#046C44] rounded-full px-6 py-3.5 shadow-2xl flex items-center gap-6 backdrop-blur-md w-max max-w-[90vw]"
          >
            {isBulkConfirming ? (
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span className="text-sm font-medium text-gray-200 whitespace-nowrap">
                  Delete {selectedIds.length} selected job{selectedIds.length > 1 ? "s" : ""}? All candidate data will be lost.
                </span>
                <div className="flex items-center gap-2 ml-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isBulkDeleting}
                    onClick={() => setIsBulkConfirming(false)}
                    className="h-8 px-3 rounded-full hover:bg-white/10 text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="h-8 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1.5"
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Yes, Delete"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="bg-[#046C44] text-xs font-bold px-2 py-0.5 rounded-full min-w-5 text-center">
                    {selectedIds.length}
                  </span>
                  <span className="text-sm font-medium text-gray-200">
                    job{selectedIds.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBulkConfirming(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full h-8 px-4 flex items-center gap-1.5 font-semibold text-xs"
                  >
                    <Trash2 size={14} />
                    Delete Selected
                  </Button>
                </div>
              </>
            )}
            {bulkError && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap">
                {bulkError}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
