import React from "react";

export default function ErrorMessage({
  title = "Wystąpił błąd",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-4">
      <div className="text-sm font-semibold text-red-100">{title}</div>
      <div className="mt-2 text-sm text-red-100/90">{children}</div>
    </div>
  );
}