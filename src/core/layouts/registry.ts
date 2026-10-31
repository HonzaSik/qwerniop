import { csQwertz } from "./cs-qwertz";
import { enUs } from "./en-us";
import type { Layout } from "./layout";

export const LAYOUTS: readonly Layout[] = [enUs, csQwertz];

/** Falls back to en-us so an id from old or edited data can never leave the app without a layout. */
export const layoutById = (id: Layout["id"]): Layout =>
  LAYOUTS.find((l) => l.id === id) ?? enUs;
