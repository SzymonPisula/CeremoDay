import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function DataToolbar({ left, right, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between " +
          "p-4 md:p-5 rounded-2xl bg-white/4 border border-white/8",
        className
      )}
    >
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex items-center gap-2 md:justify-end">{right}</div>
    </div>
  );
}
