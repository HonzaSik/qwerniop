<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import type { DailyScore } from "../../core/stats/daily";
import { t } from "../strings";
import { td } from "../strings/daily";
import { formatAccuracy } from "./session-summary";

interface Props {
  date: string;
  layout: Layout["id"];
  score: DailyScore;
}

let { date, layout, score }: Props = $props();

let status = $state("");

async function copy(): Promise<void> {
  const result = `${t.lessons.wpm(Math.round(score.wpm))} · ${formatAccuracy(score.accuracy)}`;
  const url = `${location.origin}${location.pathname}`;
  try {
    await navigator.clipboard.writeText(
      td.share(date, t.layoutNames[layout], result, url),
    );
    status = td.copied;
  } catch {
    status = td.copyFailed;
  }
}
</script>

<button type="button" onclick={copy}>{td.copy}</button>
<p class="note" role="status">{status}</p>

<style>
  .note:empty {
    display: none;
  }

  .note {
    margin: var(--space-2) 0 0;
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
