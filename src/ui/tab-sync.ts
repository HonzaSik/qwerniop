/**
 * Each tab holds its own copy of the settings and progress, and a save writes
 * the whole copy. So a tab that another tab has saved past must reload before
 * it is used, or its next save would undo the newer data.
 */
export function createTabSync(reload: () => void): {
  tell: () => void;
  regained: () => void;
  close: () => void;
} {
  const channel = new BroadcastChannel("qwerniop-saved");
  let stale = false;
  channel.onmessage = () => {
    stale = true;
  };
  return {
    tell: () => channel.postMessage(null),
    regained: () => {
      if (stale) reload();
    },
    close: () => channel.close(),
  };
}
