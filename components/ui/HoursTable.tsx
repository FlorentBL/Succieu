"use client";

import { useEffect, useState } from "react";
import { getOpeningStatus } from "@/lib/openingStatus";
import { siteConfig } from "@/lib/site";

/** Horaires de la semaine, avec le jour courant surligné en jaune colza. */
export function HoursTable({ className = "" }: { className?: string }) {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(getOpeningStatus().today);
  }, []);

  return (
    <dl className={`grid grid-cols-[auto_1fr] text-[0.95rem] ${className}`}>
      {siteConfig.mairieOpeningHours.map((row) => {
        const isToday = row.day === today;
        const closed = row.hours === "Fermé";
        const cell = isToday ? "bg-colza font-semibold text-ink" : "";
        return (
          <div key={row.day} className="contents">
            <dt className={`rounded-l-xl px-3 py-2 ${cell} ${isToday ? "" : "text-ink"}`}>
              {row.day}
              {isToday ? <span className="sr-only"> (aujourd’hui)</span> : null}
            </dt>
            <dd
              className={`rounded-r-xl px-3 py-2 tabular-nums ${cell} ${
                isToday ? "" : closed ? "text-ink-subtle" : "text-ink-muted"
              }`}
            >
              {row.hours}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
