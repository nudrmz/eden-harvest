"use client";

import Image from "next/image";

const FARM_LOGO_SRC = "/images/Farm logo2.png";

const circleBaseStyle: React.CSSProperties = {
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "center"
};

const borderByVariant = {
  hero: "1.5px solid rgba(255,255,255,0.6)",
  auth: "2.5px solid white"
} as const;

interface FarmLogoAvatarProps {
  size: number;
  className?: string;
  priority?: boolean;
  variant?: keyof typeof borderByVariant;
}

export function FarmLogoAvatar({
  size,
  className = "",
  priority = false,
  variant = "auth"
}: FarmLogoAvatarProps) {
  return (
    <Image
      src={FARM_LOGO_SRC}
      alt="Eden Harvest"
      width={size}
      height={size}
      unoptimized
      priority={priority}
      className={`shrink-0 ${className}`}
      style={{
        ...circleBaseStyle,
        border: borderByVariant[variant],
        width: `${size}px`,
        height: `${size}px`
      }}
    />
  );
}
