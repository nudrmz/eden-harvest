"use client";
import { useState } from "react";
import { copyText } from "@/lib/utils/clipboard";
export default function P() {
  const [r, setR] = useState("");
  return (
    <div className="p-6">
      <button id="b" onClick={async () => setR(String(await copyText("https://edenharvest.app/uk")))}>copy</button>
      <p id="r">{r}</p>
      <textarea id="t" />
    </div>
  );
}
