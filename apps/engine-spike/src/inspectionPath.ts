export type ScreenPoint = readonly [x: number, y: number];

export function inspectionPath(
  source: ScreenPoint,
  target: ScreenPoint,
  clearance: number,
): { path: string; label: ScreenPoint; laneY: number } {
  const laneY = Math.max(30, Math.min(source[1], target[1]) - clearance);
  const [sx, sy] = source;
  const [tx, ty] = target;
  const path = `M ${sx} ${sy} L ${sx} ${laneY + 12} Q ${sx} ${laneY} ${sx + Math.sign(tx - sx) * 12} ${laneY} L ${tx - Math.sign(tx - sx) * 12} ${laneY} Q ${tx} ${laneY} ${tx} ${laneY + 12} L ${tx} ${ty}`;
  return { path, label: [(sx + tx) / 2, laneY - 12], laneY };
}
