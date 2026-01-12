import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function SectionHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-[rgba(245,246,248,0.94)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-[rgba(245,246,248,0.66)]">
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
