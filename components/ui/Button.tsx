import { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-eden bg-eden-primary px-4 py-2 font-medium text-white transition hover:opacity-90 ${props.className ?? ""}`}
    />
  );
}
