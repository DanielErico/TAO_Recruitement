"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteJobButtonProps {
  jobId: string;
}

export function DeleteJobButton({ jobId }: DeleteJobButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/delete`, {
        method: "POST",
      });

      if (res.ok) {
        window.location.href = "/recruiter/jobs";
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to delete job.");
        setIsDeleting(false);
        setIsConfirming(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg border border-red-200 bg-red-50/50 animate-fade-in max-w-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs text-red-900 leading-normal">
            Are you sure? This will permanently delete this job posting along with all candidate applications, interviews, and AI evaluations.
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => setIsConfirming(false)}
            className="text-xs text-gray-600 hover:text-gray-900 h-7 px-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-xs h-7 px-3 bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
          >
            {isDeleting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </Button>
        </div>
        {error && <p className="text-[10px] text-red-600 mt-1 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={() => setIsConfirming(true)}
      className="flex items-center gap-1.5"
    >
      <Trash2 size={13} />
      Delete Job
    </Button>
  );
}
