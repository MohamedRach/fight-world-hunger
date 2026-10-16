import Link from "next/link";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type DonationStatus,
} from "@/features/donations/types";

const base = "rounded-full px-3 py-1 text-sm";
const activeClass = `${base} bg-emerald-600 font-medium text-white dark:bg-emerald-500 dark:text-emerald-950`;
const inactiveClass = `${base} bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15`;

/** Status filter as links (`?status=`), so it works without JavaScript. */
export function DonationStatusFilter({
  basePath,
  current,
}: {
  basePath: string;
  current: DonationStatus | undefined;
}) {
  const options: Array<[DonationStatus | undefined, string]> = [
    [undefined, "All"],
    ...DONATION_STATUSES.map((status): [DonationStatus, string] => [
      status,
      DONATION_STATUS_LABELS[status],
    ]),
  ];
  return (
    <nav aria-label="Filter by status">
      <ul className="flex flex-wrap gap-2">
        {options.map(([status, label]) => {
          const active = status === current;
          return (
            <li key={label}>
              <Link
                href={status ? `${basePath}?status=${status}` : basePath}
                aria-current={active ? "page" : undefined}
                className={active ? activeClass : inactiveClass}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
