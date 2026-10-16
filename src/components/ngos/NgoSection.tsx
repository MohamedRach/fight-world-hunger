import type { ReactNode } from "react";

/** Shared section shell for NGO profile pages. */
export function NgoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}
