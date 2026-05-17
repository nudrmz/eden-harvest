import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <div className="glass-card p-4">{children}</div>;
}
