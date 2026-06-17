"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User,
} from "lucide-react";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Admin
  { label: "Overview", href: "/admin", icon: LayoutDashboard, roles: ["admin"] },
  { label: "User Management", href: "/admin/users", icon: Users, roles: ["admin"] },

  // Recruiter
  { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard, roles: ["recruiter", "admin"] },
  { label: "Jobs", href: "/recruiter/jobs", icon: Briefcase, roles: ["recruiter", "admin"] },
  { label: "Candidates", href: "/recruiter/candidates", icon: Users, roles: ["recruiter", "admin"] },
  { label: "Pipeline", href: "/recruiter/pipeline", icon: ChevronRight, roles: ["recruiter", "admin"] },

  // Candidate
  { label: "Dashboard", href: "/candidate", icon: LayoutDashboard, roles: ["candidate"] },
  { label: "Browse Jobs", href: "/candidate/jobs", icon: Briefcase, roles: ["candidate"] },
  { label: "My Applications", href: "/candidate/applications", icon: FileText, roles: ["candidate"] },
  { label: "My Interviews", href: "/candidate/interviews", icon: MessageSquare, roles: ["candidate"] },
  { label: "My Profile", href: "/candidate/profile", icon: User, roles: ["candidate"] },
];

interface SidebarProps {
  role: UserRole;
  fullName: string;
  email: string;
}

export function Sidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function handleSignOut() {
    document.cookie = "user_role=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "mock_user_id=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "mock_user_email=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "mock_user_name=; path=/; max-age=0; SameSite=Lax";
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <Image src="/logo.webp" alt="TAO" width={68} height={26} priority />
        <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 font-medium uppercase tracking-widest">
          Recruit AI
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/recruiter" || item.href === "/admin" || item.href === "/candidate"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn("nav-link", isActive && "active")}
            >
              <Icon size={16} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom: profile + sign out */}
      <div className="px-3 py-4 space-y-1">
        <Link
          href={`/${role}/settings`}
          className="nav-link"
          onClick={() => setMobileOpen(false)}
        >
          <Settings size={16} strokeWidth={1.75} />
          Settings
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-foreground)] truncate">{fullName}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-[var(--color-border)] bg-white shrink-0 fixed top-0 bottom-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--color-border)]">
        <Image src="/logo.webp" alt="TAO" width={56} height={22} />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="pt-14">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
