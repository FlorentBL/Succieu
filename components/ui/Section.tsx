export function Section({
  id,
  title,
  eyebrow,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 ${className}`}
      {...(id ? { "aria-labelledby": `${id}-titre` } : {})}
    >
      {eyebrow ? (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brass">
          {eyebrow}
        </p>
      ) : null}
      <h2
        {...(id ? { id: `${id}-titre` } : {})}
        className="font-display mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
      >
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}
