"use client";

import Image from "next/image";

const FARM_LOGO_SRC = "/images/Farm logo2.png";

const circleBaseStyle: React.CSSProperties = {
  borderRadius: "50%",
  border: "2.5px solid white",
  objectFit: "cover",
  objectPosition: "center"
};

interface FarmLogoAvatarProps {
  size: number;
  className?: string;
  priority?: boolean;
}

export function FarmLogoAvatar({ size, className = "", priority = false }: FarmLogoAvatarProps) {
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
        width: `${size}px`,
        height: `${size}px`
      }}
    />
  );
}
