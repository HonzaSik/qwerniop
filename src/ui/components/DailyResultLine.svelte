<script lang="ts">
import type { DailyResult } from "../../core/stats/daily";
import { ui } from "../state.svelte";
import { t } from "../strings";
import { td } from "../strings/daily";
import DailyCopy from "./DailyCopy.svelte";
import { formatAccuracy } from "./session-summary";

interface Props {
  result: DailyResult;
}

let { result }: Props = $props();

const text = $derived(
  `${t.lessons.wpm(Math.round(result.score.wpm))} · ${formatAccuracy(result.score.accuracy)}`,
);
</script>

<div class="daily">
  <p>{result.first ? td.score(text) : td.practice(text)}</p>
  <DailyCopy date={result.date} layout={ui.settings.layout} score={result.score} />
</div>

<style>
  .daily {
    margin-bottom: var(--space-4);
    text-align: center;
  }

  p {
    margin: 0 0 var(--space-2);
    font-weight: var(--weight-semibold);
  }
</style>
