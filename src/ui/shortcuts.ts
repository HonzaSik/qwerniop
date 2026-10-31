type Key = Pick<
  KeyboardEvent,
  "key" | "repeat" | "ctrlKey" | "metaKey" | "altKey" | "defaultPrevented"
>;

// Typing targets never trigger shortcuts: the session textarea must receive "?" and Esc.
// Structural, so the check runs in tests without a DOM.
interface Target {
  tagName?: string;
  isContentEditable?: boolean;
}
const typingTarget = (target: Target | null): boolean =>
  target !== null &&
  (target.isContentEditable === true ||
    /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName ?? ""));

function plain(event: Key, target: Target | null): boolean {
  return !(
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    typingTarget(target)
  );
}

export const isHelpKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === "?";

export const isBackKey = (event: Key, target: Target | null): boolean =>
  plain(event, target) && event.key === "Escape";
