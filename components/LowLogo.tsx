"use client";

import { useState } from "react";

const REQUESTED_LOGO_SRC = "https://raw.githubusercontent.com/samersg20/lowlabel/main/public/img/logo_etiketi.png";
const FALLBACK_LOGO_SRC = "/lowbbq-logo.svg";

export function LowLogo({ width = 220, compact = false }: { width?: number; compact?: boolean }) {
  const [src, setSrc] = useState(REQUESTED_LOGO_SRC);
  const height = compact ? Math.round(width * 0.32) : Math.round(width * 0.42);

  return (
    <img
      src={src}
      alt="Low BBQ"
      width={width}
      height={height}
      style={{ objectFit: "contain" }}
      onError={() => setSrc(FALLBACK_LOGO_SRC)}
    />
  );
}
