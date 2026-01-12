import type { TextareaHTMLAttributes } from "react";
import { cn } from "../theme/helpers";

export default function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white/90 " +
          "placeholder:text-white/35 outline-none focus:border-[#c8a04b]/60 focus:ring-2 focus:ring-[#c8a04b]/20 " +
          "transition resize-none",
        className
      )}
      {...props}
    />
  );
}
