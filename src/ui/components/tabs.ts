/** The tab a key moves to, wrapping at the ends; undefined for any other key. */
export function nextTab(
  key: string,
  index: number,
  count: number,
): number | undefined {
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}
