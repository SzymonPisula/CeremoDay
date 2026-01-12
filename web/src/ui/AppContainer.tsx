import { ReactNode } from "react";

export default function AppContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {children}
    </div>
  );
}
