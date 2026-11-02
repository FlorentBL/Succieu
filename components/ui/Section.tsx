export function Section({
  id,
  title,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  /** Conservé pour compatibilité ; n’est plus affiché. */
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
      <h2
        {...(id ? { id: `${id}-titre` } : {})}
        className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.875rem]"
      >
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}
