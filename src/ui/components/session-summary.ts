const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** A whole percent that never rounds a session with an error up to 100 %. */
export function formatAccuracy(fraction: number): string {
  const percent = Math.round(fraction * 100);
  return `${fraction < 1 ? Math.min(percent, 99) : percent} %`;
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
