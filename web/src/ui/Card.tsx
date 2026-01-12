import type { HTMLAttributes } from "react";
import { cn } from "../theme/helpers";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "solid";
};

/**
 * Bazowy kafel/sekcja — lekki, premium, dużo “powietrza”.
 * Padding ustawiamy w miejscu użycia (np. p-6 / p-8).
 */
export default function Card({ tone = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn(tone === "default" ? "cd-card" : "cd-card-solid", "animate-[cdFadeUp_260ms_ease-out]", className)}
      {...props}
    />
  );
}
