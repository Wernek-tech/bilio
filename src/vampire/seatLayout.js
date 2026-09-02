export function vampireSeatPosition(index, count) {
  const safeCount = Math.max(1, count);
  const angle = (Math.PI * 2 * index / safeCount) - Math.PI / 2;
  const radiusX = count >= 11 ? 43 : count >= 9 ? 41.5 : 40;
  const radiusY = count >= 11 ? 39 : count >= 9 ? 38 : 37;
  return {left: `${50 + radiusX * Math.cos(angle)}%`, top: `${50 + radiusY * Math.sin(angle)}%`};
}
