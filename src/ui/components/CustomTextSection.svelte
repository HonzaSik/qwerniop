<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { layoutById } from "../../core/layouts/registry";
import { CUSTOM_TEXT_MAX, prepareCustomText } from "../../core/text/custom";
import { t } from "../strings";

interface Props {
  layout: Layout["id"];
  onstart: (text: string) => void;
  draft: string;
}

let { layout, onstart, draft = $bindable() }: Props = $props();

const prepared = $derived(prepareCustomText(layoutById(layout), draft));
const note = $derived(
  [
    draft.length >= CUSTOM_TEXT_MAX ? t.custom.cut(CUSTOM_TEXT_MAX) : "",
    draft.trim() === ""
      ? ""
      : prepared.text === ""
        ? t.custom.nothing
        : prepared.dropped > 0
          ? t.custom.dropped(prepared.dropped)
          : "",
  ]
    .filter(Boolean)
    .join(" "),
);
</script>

<section aria-labelledby="track-custom">
  <h2 id="track-custom">{t.custom.title}</h2>
  <p class="note">{t.custom.intro}</p>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      onstart(prepared.text);
    }}
  >
    <textarea
      rows="4"
      spellcheck="false"
      maxlength={CUSTOM_TEXT_MAX}
      aria-label={t.custom.field}
      aria-describedby="custom-note"
      bind:value={draft}
    ></textarea>
    <p class="note" id="custom-note" role="status">{note}</p>
    <button type="submit" class="primary" disabled={prepared.text === ""}>{t.custom.start}</button>
  </form>
</section>

<style>
  section {
    margin-bottom: var(--space-6);
  }

  h2 {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  section > .note {
    margin: var(--space-1) 0 var(--space-3);
  }

  form {
    display: grid;
    gap: var(--space-2);
    justify-items: start;
  }

  /* Stays in the page while empty, as a live region must exist before its content arrives; the margin cancels its grid gap. */
  form .note:empty {
    margin-bottom: calc(-1 * var(--space-2));
  }
</style>
