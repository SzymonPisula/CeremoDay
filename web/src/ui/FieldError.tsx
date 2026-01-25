import React from "react";

export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mt-1 text-sm text-red-200/90 flex items-start gap-2">
      <span className="select-none">⚠️</span>
      <span>{message}</span>
    </div>
  );
}