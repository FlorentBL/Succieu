"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOpeningStatus, type OpeningStatus } from "@/lib/openingStatus";

function hoursLabel(hours: string) {
  return hours.replace(/:00/g, "h").replace(/:(\d{2})/g, "h$1").replace(/\s*[–-]\s*/, " – ").replace(/\b0(\d)h/g, "$1h");
}

function sentence(s: OpeningStatus) {
  if (s.state === "open" && s.todayHours)
    return { lead: "Mairie ouverte", rest: `jusqu’à ${hoursLabel(s.todayHours).split(" – ")[1]}` };
  if (s.state === "later" && s.todayHours)
    return { lead: "Mairie ouverte aujourd’hui", rest: hoursLabel(s.todayHours) };
  if (s.next)
    return {
      lead: "Mairie fermée",
      rest: `réouverture ${s.next.day.toLowerCase()} ${hoursLabel(s.next.hours)}`,
    };
  return { lead: "Mairie fermée", rest: "" };
}

/**
 * État d’ouverture de la mairie, calculé dans le navigateur (heure de Paris)
 * pour rester juste malgré le rendu statique de la page.
 */
export function TodayStatus({
  variant = "bar",
  className = "",
}: {
  variant?: "bar" | "panel";
  className?: string;
}) {
  const [status, setStatus] = useState<OpeningStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpeningStatus());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const open = status?.state === "open";
  const text = status ? sentence(status) : null;

  if (variant === "bar") {
    return (
      <Link
        href="/contact#mairie"
        className={`inline-flex min-h-8 items-center gap-2 rounded-full text-sm text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            open ? "bg-colza" : "bg-white/45"
          }`}
          aria-hidden
        />
        {text ? (
          <span>
            <strong className="font-semibold text-white">{text.lead}</strong>
            {text.rest ? ` · ${text.rest}` : null}
          </span>
        ) : (
          <span>Horaires de la mairie</span>
        )}
      </Link>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
        open ? "bg-colza text-ink" : "bg-colza-pale text-ink"
      } ${className}`}
      aria-live="polite"
    >
      <span
        className={`relative flex h-3 w-3 shrink-0 rounded-full ${
          open ? "bg-moss-dark" : "bg-ink-subtle"
        }`}
        aria-hidden
      />
      <p className="text-[0.95rem] leading-snug">
        {text ? (
          <>
            <strong className="font-semibold">{text.lead}</strong>
            {text.rest ? <span className="text-ink-muted"> · {text.rest}</span> : null}
          </>
        ) : (
          <strong className="font-semibold">Horaires d’accueil de la mairie</strong>
        )}
      </p>
    </div>
  );
}
