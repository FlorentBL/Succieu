export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group/card rounded-[1.25rem] border border-border-subtle bg-surface p-6 shadow-[0_1px_2px_rgba(20,33,26,0.05),0_10px_28px_-18px_rgba(20,33,26,0.22)] sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}
