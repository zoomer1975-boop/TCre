"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ClipboardCheck,
  ChevronsUpDown,
  FilePlus2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Scale,
  Settings
} from "lucide-react";
import { Role, User, canAccessRole, formatNumber } from "@/lib/domain";
import { switchUserAction } from "@/app/account/actions";

const navItems: Array<{
  href: string;
  label: string;
  role: Role;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/", label: "운영 현황", role: "CONTRIBUTOR", icon: LayoutDashboard },
  { href: "/contributions/new", label: "공헌 입력", role: "CONTRIBUTOR", icon: FilePlus2 },
  { href: "/contributions/mine", label: "공헌 내역", role: "CONTRIBUTOR", icon: ListChecks },
  { href: "/approvals", label: "승인 처리", role: "APPROVER", icon: ClipboardCheck },
  { href: "/approver-insights", label: "승인자 조회", role: "APPROVER", icon: Gauge },
  { href: "/committee", label: "위원회 심의", role: "COMMITTEE", icon: Scale },
  { href: "/admin", label: "관리자", role: "ADMIN", icon: Settings }
];

function getRequiredRoleForPath(pathname: string) {
  return navItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.role;
}

export function AppShell({
  user,
  users,
  cumulativeCredits,
  headerActionCount,
  pendingApprovalCount,
  pendingRecommendationCount,
  children
}: {
  user: User;
  users: User[];
  cumulativeCredits: number;
  headerActionCount: number;
  pendingApprovalCount: number;
  pendingRecommendationCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const visibleItems = navItems.filter((item) => canAccessRole(user, item.role));

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function switchUser(userId: string) {
    const nextUser = users.find((item) => item.id === userId);
    if (!nextUser || nextUser.id === user.id) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      await switchUserAction(nextUser.id);
      setOpen(false);

      const requiredRole = getRequiredRoleForPath(pathname);
      if (requiredRole && !canAccessRole(nextUser, requiredRole)) {
        router.push("/");
      }
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-line bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center gap-3 px-5 py-5">
            <img
              src="/logos/kmu-bisa-symbol.jpg"
              alt="Keimyung University Bisa symbol mark"
              className="h-12 w-auto max-w-[112px] shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">Keimyung Univ.</p>
              <p className="text-lg font-bold tracking-normal text-ink">T-Credit</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const navBadgeCount =
                item.href === "/contributions/mine"
                  ? pendingRecommendationCount
                  : item.href === "/approvals"
                    ? pendingApprovalCount
                    : undefined;
              const navBadgeLabel =
                item.href === "/approvals" ? "승인 대기 공헌" : "추천 의견 입력 대기";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-fit items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition lg:w-full ${
                    active
                      ? "bg-campus text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {navBadgeCount !== undefined ? (
                    <span
                      className={`flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold leading-5 ${
                        navBadgeCount > 0
                          ? "bg-rose-600 text-white"
                          : active
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                      aria-label={`${navBadgeLabel} ${formatNumber(navBadgeCount)}건`}
                      title={`${navBadgeLabel} ${formatNumber(navBadgeCount)}건`}
                    >
                      {navBadgeCount > 99 ? "99+" : navBadgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-line px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-normal text-muted">My Role</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {role}
              </span>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-line bg-white px-5 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex max-w-full items-center gap-3 rounded-md border border-transparent px-2 py-1 text-left transition hover:border-line hover:bg-slate-50"
                aria-expanded={open}
              >
                <div className="relative shrink-0">
                  <div className="flex size-9 items-center justify-center rounded-full bg-campus text-sm font-bold text-white">
                    {user.name.slice(0, 1)}
                  </div>
                  <span
                    className={`absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[11px] font-extrabold leading-4 ${
                      headerActionCount > 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                    aria-label={`처리 대기 ${formatNumber(headerActionCount)}건`}
                    title={`처리 대기 ${formatNumber(headerActionCount)}건`}
                  >
                    {headerActionCount > 99 ? "99+" : headerActionCount}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-sm text-muted">
                    {user.position} · {user.email}
                  </p>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
              {open ? (
                <div className="absolute left-0 top-full z-20 mt-2 w-[min(92vw,420px)] rounded-lg border border-line bg-white p-2 shadow-soft">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-normal text-muted">계정 전환</p>
                  <div className="max-h-80 overflow-y-auto">
                    {users.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => switchUser(item.id)}
                        disabled={isPending}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-ink">
                          {item.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                            {item.id === user.id ? <Check className="size-4 text-campus" aria-hidden="true" /> : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">
                            {item.position} · {item.employeeNo}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.roles.map((role) => (
                              <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="inline-flex items-baseline justify-end gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-right shadow-soft">
              <span className="text-sm font-bold text-campus">내 누적 Credits</span>
              <span className="text-2xl font-extrabold text-ink">{formatNumber(cumulativeCredits)}</span>
              <span className="text-sm font-bold text-ink">C</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
