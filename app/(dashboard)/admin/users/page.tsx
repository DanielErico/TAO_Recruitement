"use client";

import { useState, useEffect, useCallback } from "react";
import { redirect } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  ShieldCheck,
  UserCog,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "recruiter";
  created_at: string;
}

function generatePassword(length = 12) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    role: "recruiter" as "recruiter" | "admin",
    password: generatePassword(),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to load users.");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create user.");
        return;
      }

      setCreatedUser({ email: form.email.trim().toLowerCase(), password: form.password });
      await fetchUsers();
      setForm({ email: "", fullName: "", role: "recruiter", password: generatePassword() });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    setDeleting(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete user.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const recruiterCount = users.filter((u) => u.role === "recruiter").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage admin and recruiter accounts.
          </p>
        </div>
        <Button onClick={() => { setShowModal(true); setCreatedUser(null); setFormError(null); }} className="gap-2">
          <Plus size={15} />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-brand-light">
              <Users size={16} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Staff</p>
              <p className="text-2xl font-semibold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-50">
              <ShieldCheck size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Admins</p>
              <p className="text-2xl font-semibold">{adminCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-50">
              <UserCog size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Recruiters</p>
              <p className="text-2xl font-semibold">{recruiterCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Staff Accounts</CardTitle>
          <CardDescription>All admin and recruiter accounts on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive bg-red-50 rounded-md px-3 py-2 mb-4">{error}</p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No staff accounts yet. Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Created</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">{user.full_name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="secondary"
                          className={
                            user.role === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {deleting === user.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setCreatedUser(null); }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Add Staff Account</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new admin or recruiter.</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setCreatedUser(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createdUser ? (
              /* Success state */
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-emerald-800 mb-3">
                    ✅ Account created successfully!
                  </p>
                  <p className="text-xs text-emerald-700 mb-3">
                    Share these credentials with the new staff member. The password will not be shown again.
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white rounded border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Email</p>
                      <p className="text-sm font-mono text-foreground">{createdUser.email}</p>
                    </div>
                    <div className="bg-white rounded border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Password</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-mono text-foreground">{createdUser.password}</p>
                        <button
                          onClick={() => copyToClipboard(`Email: ${createdUser.email}\nPassword: ${createdUser.password}`)}
                          className="text-muted-foreground hover:text-brand transition-colors cursor-pointer"
                        >
                          {copied ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setCreatedUser(null); }}
                  >
                    Add Another
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => { setShowModal(false); setCreatedUser(null); }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    required
                    placeholder="Jane Smith"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    required
                    placeholder="jane@tao.org"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <div className="flex gap-2">
                    {(["recruiter", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: r }))}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all cursor-pointer ${
                          form.role === r
                            ? "border-brand bg-brand-light text-brand"
                            : "border-border text-muted-foreground hover:border-brand/50"
                        }`}
                      >
                        {r === "recruiter" ? "Recruiter" : "Admin"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="userPassword">Temporary Password</Label>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                      className="text-xs text-brand hover:underline cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="userPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Share this temporary password with the staff member. They can change it after logging in.
                  </p>
                </div>

                {formError && (
                  <p className="text-sm text-destructive bg-red-50 rounded-md px-3 py-2">{formError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting && <Loader2 size={14} className="animate-spin mr-2" />}
                    {submitting ? "Creating…" : "Create Account"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
