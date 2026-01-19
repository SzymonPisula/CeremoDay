import { forwardRef, useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
};

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, leftIcon, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="space-y-2">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium tracking-wide text-[rgba(245,246,248,0.72)]"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/60">
            {leftIcon}
          </div>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[14px] px-4 py-3 text-sm",
            leftIcon ? "pl-10" : "",
            "border border-white/10 bg-white/[0.045] backdrop-blur-xl",
            "text-[rgba(245,246,248,0.92)] placeholder:text-[rgba(245,246,248,0.40)]",
            "outline-none transition",
            "focus:border-[rgba(212,175,55,0.35)] focus:ring-2 focus:ring-[rgba(212,175,55,0.18)]",
            error
              ? "border-[rgba(255,80,80,0.40)] focus:border-[rgba(255,80,80,0.55)] focus:ring-[rgba(255,80,80,0.18)]"
              : "",
            className
          )}
          {...props}
        />
      </div>

      {error ? (
        <div className="text-xs text-[rgba(255,220,220,0.92)]">{error}</div>
      ) : hint ? (
        <div className="text-xs text-[rgba(245,246,248,0.55)]">{hint}</div>
      ) : null}
    </div>
  );
});

export default Input;
