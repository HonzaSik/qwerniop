import type { Layout } from "../core/layouts/layout";
import { dayKey } from "../core/stats/practice";
import { dailyText } from "../core/text/daily";
import { dailyDate, td } from "./strings/daily";

// Apart from App because the first page load has a size budget, and most visits never start a challenge.
export function dailyRun(layout: Layout["id"], words: readonly string[]) {
  const date = dayKey(Date.now());
  return {
    custom: dailyText(date, layout, words),
    daily: date,
    dailyTitle: td.practiceTitle(dailyDate(date)),
  };
}
