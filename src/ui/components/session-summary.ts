const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** A whole percent that never rounds a session with an error up to 100 %. */
export function formatAccuracy(fraction: number): string {
  const percent = Math.round(fraction * 100);
  return `${fraction < 1 ? Math.min(percent, 99) : percent}\u00a0%`;
}

/** A rounded change with its sign, as in +3 or −1; a real minus, so it lines up with the plus. */
export function formatChange(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded).replace("-", "\u2212");
}

/** Minutes and seconds, as in 1:05. */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / MS_PER_SECOND);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${rest}`;
}

/** `onButton`: Enter on a focused button is already that button's click. */
export function isRestartKey(
  event: Pick<
    KeyboardEvent,
    "key" | "repeat" | "ctrlKey" | "metaKey" | "altKey" | "defaultPrevented"
  >,
  onButton: boolean,
): boolean {
  // A prevented key belongs to input: a final Enter that finishes the passage reaches here too.
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return false;
  }
  return event.key === "Enter" ? !onButton : event.key.toLowerCase() === "r";
}

/** The characters behind key labels. Letters are shown as capitals, and a named key such as Enter cannot be drilled. */
export const drillKeys = (labels: readonly string[]): string[] =>
  labels.filter((label) => [...label].length === 1).map((l) => l.toLowerCase());
