export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group/card rounded-2xl border border-border-subtle bg-surface p-7 shadow-[0_1px_0_rgba(26,22,20,0.06),0_16px_48px_-24px_rgba(26,22,20,0.14)] transition duration-300 hover:-translate-y-1 hover:border-brass/25 hover:shadow-[0_20px_56px_-28px_rgba(26,22,20,0.2)] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
