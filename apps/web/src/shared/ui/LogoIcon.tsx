/**
 * CloudBlocks logo icon — three blue rounded squares in a cloud-like cluster.
 * Renders as inline SVG for crisp scaling at any size.
 */
export function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Bottom-left block */}
      <rect x="3" y="25" width="20" height="20" rx="4" fill="#3b82f6" />
      {/* Bottom-right block */}
      <rect x="25" y="25" width="20" height="20" rx="4" fill="#2563eb" />
      {/* Top-center block (cloud peak) */}
      <rect x="14" y="3" width="20" height="20" rx="4" fill="#1d4ed8" />
    </svg>
  );
}
