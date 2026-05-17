import { PropsWithChildren } from "react";

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85">
      {children}
    </span>
  );
}
