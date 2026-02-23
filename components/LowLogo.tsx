export function LowLogo({ width = 220, compact = false }: { width?: number; compact?: boolean }) {
  const height = compact ? Math.round(width * 0.32) : Math.round(width * 0.42);

  return (
    <svg width={width} height={height} viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Low BBQ">
      <title>Low BBQ</title>
      <polygon points="20,70 160,10 300,70 160,130" fill="none" stroke="#0b4c73" strokeWidth="6" />
      <text x="160" y="84" textAnchor="middle" fontSize="56" fontFamily="Arial Black, Arial" fill="#0b4c73">LOW</text>
      <text x="160" y="108" textAnchor="middle" fontSize="18" fontFamily="Arial" fill="#0b4c73">BBQ</text>
    </svg>
  );
}
