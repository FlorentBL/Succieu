"use client";

import type { ReactNode } from "react";

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

const control = `block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-subtle aria-[invalid=true]:border-tuile aria-[invalid=true]:bg-tuile-pale/40 ${focusRing}`;

type Common = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
};

function Wrap({ id, label, error, hint, optional, className = "", children }: Common & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.95rem] font-semibold text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (facultatif)</span> : null}
      </label>
      {hint ? (
        <div id={`${id}-hint`} className="mt-0.5 text-sm text-ink-muted">
          {hint}
        </div>
      ) : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-tuile" style={{ color: "#9c3a22" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy({ id, hint, error }: Pick<Common, "id" | "hint" | "error">, extra?: string) {
  return [hint ? `${id}-hint` : "", extra ?? "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
}

export function TextField(
  p: Common & {
    value: string;
    onChange: (v: string) => void;
    type?: "text" | "date" | "time" | "url" | "password";
    max?: number;
    autoComplete?: string;
    required?: boolean;
  },
) {
  return (
    <Wrap {...p}>
      <input
        id={p.id}
        name={p.id}
        type={p.type ?? "text"}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        autoComplete={p.autoComplete ?? "off"}
        required={p.required}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(p)}
        className={control}
      />
    </Wrap>
  );
}

export function TextArea(
  p: Common & { value: string; onChange: (v: string) => void; max: number; rows?: number; counter?: boolean },
) {
  const len = p.value.trim().length;
  const over = len > p.max;
  return (
    <Wrap {...p}>
      <textarea
        id={p.id}
        name={p.id}
        rows={p.rows ?? 4}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(p, p.counter ? `${p.id}-count` : undefined)}
        className={`${control} resize-y`}
      />
      {p.counter ? (
        <p
          id={`${p.id}-count`}
          className={`mt-1 text-right text-sm tabular-nums ${over ? "font-semibold" : "text-ink-muted"}`}
          style={over ? { color: "#9c3a22" } : undefined}
        >
          {len} / {p.max} caractères
          {over ? <span className="sr-only"> : limite dépassée</span> : null}
        </p>
      ) : null}
    </Wrap>
  );
}

export function SelectField(p: Common & { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <Wrap {...p}>
      <select
        id={p.id}
        name={p.id}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(p)}
        className={control}
      >
        <option value="">{p.placeholder}</option>
        {p.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
  const v =
    variant === "primary"
      ? "bg-moss-dark text-white hover:bg-moss"
      : "border border-ink-subtle/50 bg-surface text-ink hover:bg-pre-pale";
  return (
    <button className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Notice({ tone, children, id }: { tone: "error" | "success"; children: ReactNode; id?: string }) {
  const cls =
    tone === "error"
      ? "border-tuile/50 bg-tuile-pale text-ink"
      : "border-moss/40 bg-pre-pale text-ink";
  return (
    <div id={id} role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-[0.95rem] ${cls}`}>
      {children}
    </div>
  );
}
