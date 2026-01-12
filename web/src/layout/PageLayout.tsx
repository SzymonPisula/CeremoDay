import type { ReactNode } from "react";
import SectionHeader from "../ui/SectionHeader";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageLayout({ title, subtitle, actions, children }: Props) {
  return (
    <div className="relative">
      {/* centralny kontener strony */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10 lg:px-12 py-6 md:py-8 space-y-8">
        <SectionHeader title={title} subtitle={subtitle} actions={actions} />

        {/* główna tafla contentu */}
        <div
          className="
            relative rounded-[36px]
            border border-white/10
            bg-white/[0.045] backdrop-blur-xl
            p-5 md:p-7 lg:p-8
            shadow-[0_30px_120px_rgba(0,0,0,0.55)]
          "
        >
          <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
          <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#c8a04b]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative space-y-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
