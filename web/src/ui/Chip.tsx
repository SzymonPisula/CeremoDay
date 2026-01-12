import { cn } from "../theme/helpers";

export default function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/70", className)}>
      {children}
    </span>
  );
}
