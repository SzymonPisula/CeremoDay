import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-6 md:p-8">
      <div className="text-lg font-semibold text-white/90">{title}</div>
      {description ? <div className="mt-1 text-sm text-white/55">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
