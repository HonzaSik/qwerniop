import type { Layout } from "../core/layouts/layout";
import csUrl from "../data/words/cs.txt?url";
import enUrl from "../data/words/en.txt?url";

const URLS: Record<Layout["id"], string> = {
  "en-us": enUrl,
  "cs-qwertz": csUrl,
};

// Fetched assets, so the lists stay out of the JS bundle and get their own size budget.
export async function loadWords(layout: Layout["id"]): Promise<string[]> {
  const res = await fetch(URLS[layout]);
  if (!res.ok) throw new Error(`Word list failed to load: ${res.status}`);
  return (await res.text()).split("\n").filter(Boolean);
}

export async function loadSnippets(): Promise<string> {
  return (await import("../data/code/js.txt?raw")).default;
}
