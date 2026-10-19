"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { SessionAccount } from "@/features/accounts/types";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

interface AppNavMenuProps {
  user: SessionAccount | null;
}

type NavLink = { href: string; label: string; description?: string };

function linksFor(user: SessionAccount | null): NavLink[] {
  const common: NavLink[] = [
    { href: "/map", label: "Map", description: "Explore hunger and campaigns by country" },
  ];

  if (!user) return common;

  if (user.type === "INDIVIDUAL") {
    return [
      ...common,
      { href: "/me/donations", label: "My donations", description: "Track your simulated donations" },
      { href: "/me/payment-methods", label: "Payment methods", description: "Manage your mock cards" },
      { href: "/me", label: "My profile", description: "Your donor profile" },
    ];
  }

  return [
    ...common,
    { href: "/dashboard", label: "Dashboard", description: "Your organizations and campaigns" },
    { href: "/dashboard/campaigns/new", label: "New campaign", description: "Start raising funds" },
  ];
}

/** Burger menu used by every page, so navigation is identical everywhere. */
export function AppNavMenu({ user }: AppNavMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change, Escape, or a click outside the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const links = linksFor(user);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          {open ? (
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          ) : (
            <path d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25A.75.75 0 0 1 3.75 9.25h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" />
          )}
        </svg>
        <span className="hidden sm:inline">Menu</span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl"
        >
          <nav aria-label="Main navigation" className="p-2">
            <ul className="space-y-0.5">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "text-slate-200 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="font-medium">{link.label}</span>
                      {link.description ? (
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {link.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-white/10 p-3">
            {user ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Signed in as{" "}
                  <span className="break-all font-medium text-slate-200">{user.email}</span>
                  <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {user.type === "NGO" ? "NGO" : "Individual"}
                  </span>
                </p>
                <SignOutButton className="w-full rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Sign in to donate or to manage an organization.
                </p>
                <Link
                  href="/sign-in?as=individual"
                  className="block rounded-full bg-emerald-500 px-4 py-1.5 text-center text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                >
                  Sign in as an individual
                </Link>
                <Link
                  href="/sign-in?as=ngo"
                  className="block rounded-full border border-white/20 px-4 py-1.5 text-center text-sm font-medium text-white hover:bg-white/10"
                >
                  Sign in as an NGO
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
