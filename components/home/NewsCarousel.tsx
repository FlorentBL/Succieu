"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconArrowRight, IconChevronDown } from "@/components/icons/UiIcons";
import type { HomeSpotlightItem } from "@/lib/homeSpotlight";

const DELAY_MS = 7000;

/**
 * Carrousel des actualités, dans l’aplat vert de l’accueil.
 * Défilement automatique (7 s) mis en pause au survol, au focus, par le bouton Pause
 * et désactivé si l’utilisateur préfère réduire les animations.
 */
export function NewsCarousel({ items }: { items: HomeSpotlightItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const regionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const running = count > 1 && !paused && !hovered && !reduced;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => go(index + 1), DELAY_MS);
    return () => window.clearTimeout(id);
  }, [running, index, go]);

  if (count === 0) return null;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Actualités de la commune"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setHovered(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="grid" id={regionId} aria-live={running ? "off" : "polite"}>
        {items.map((item, i) => {
          const active = i === index;
          return (
            <article
              key={item.id}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={`col-start-1 row-start-1 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
                active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
              }`}
            >
              {item.meta ? (
                <p
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    item.alert ? "bg-colza text-ink" : "bg-white/15 text-white"
                  }`}
                >
                  {item.meta}
                </p>
              ) : null}
              <h3 className="font-display mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                {item.title}
              </h3>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/90">
                {item.body}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-colza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {item.cta} <IconArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/actualites"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-colza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Toutes les actualités
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-controls={regionId}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <IconChevronDown className="h-5 w-5 rotate-90" />
            <span className="sr-only">Actualité précédente</span>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-controls={regionId}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <IconChevronDown className="h-5 w-5 -rotate-90" />
            <span className="sr-only">Actualité suivante</span>
          </button>

          <ol className="ml-2 flex items-center gap-1" aria-label="Choisir une actualité">
            {items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === index ? "true" : undefined}
                  className="group flex h-8 items-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      i === index ? "w-8 bg-colza" : "w-2 bg-white/45 group-hover:bg-white/80"
                    }`}
                  />
                  <span className="sr-only">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>

          {!reduced ? (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="ml-auto inline-flex min-h-8 items-center rounded-full px-3 text-sm font-medium text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {paused ? "Reprendre le défilement" : "Mettre en pause"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
