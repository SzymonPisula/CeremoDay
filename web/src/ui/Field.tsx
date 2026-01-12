import type { ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export default function Field({ label, hint, children }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] tracking-wide uppercase text-white/55">{label}</div>
      {children}
      {hint ? <div className="text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}
