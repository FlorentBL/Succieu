export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-surface p-6 shadow-[0_1px_0_rgba(26,22,20,0.05),0_14px_40px_-22px_rgba(26,22,20,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_-20px_rgba(26,22,20,0.16)] ${className}`}
    >
      {children}
    </div>
  );
}
