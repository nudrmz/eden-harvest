"use client";

import Image from "next/image";

interface EdenHarvestLogoProps {
  height: number;
  className?: string;
  priority?: boolean;
}

export function EdenHarvestLogo({ height, className = "", priority = false }: EdenHarvestLogoProps) {
  return (
    <Image
      src="/images/Eden-Harvest_Logo.png"
      alt="Eden Harvest"
      width={Math.round(height * 3.2)}
      height={height}
      unoptimized
      priority={priority}
      className={`mx-auto w-auto max-w-full object-contain ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}
