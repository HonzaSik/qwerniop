import wordsUrl from "../data/words/en.txt?url";

// A fetched asset, so the list stays out of the JS bundle and gets its own size budget.
export async function loadWords(): Promise<string[]> {
  const res = await fetch(wordsUrl);
  if (!res.ok) throw new Error(`Word list failed to load: ${res.status}`);
  return (await res.text()).split("\n").filter(Boolean);
}

export async function loadSnippets(): Promise<string> {
  return (await import("../data/code/js.txt?raw")).default;
}
