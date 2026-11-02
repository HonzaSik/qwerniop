type Key = Pick<
  KeyboardEvent,
  "key" | "repeat" | "ctrlKey" | "metaKey" | "altKey" | "defaultPrevented"
>;

// Typing targets never trigger shortcuts: the session textarea must receive "?" and Esc.
// Structural, so the check runs in tests without a DOM.
interface Target {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}
const typingTarget = (target: Target | null): boolean =>
  target !== null &&
  (target.isContentEditable === true ||
    /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName ?? ""));

// A modal handles its own Esc; acting on it here too would also leave the view behind it.
const inDialog = (target: Target | null): boolean =>
  (target?.closest?.("dialog[open]") ?? null) !== null;

function plain(event: Key, target: Target | null): boolean {
  return !(
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    typingTarget(target) ||
    inDialog(target)
  );
}

// Enter on any of these already does what the control means.
const onControl = (target: Target | null): boolean =>
  typingTarget(target) || /^(A|BUTTON|SUMMARY)$/.test(target?.tagName ?? "");

export const isStartKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === "Enter" && !onControl(target);

export const isHelpKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === "?";

export const isBackKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === "Escape";

export const isSettingsKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === ",";
