<script lang="ts">
import "./ui/styles/tokens.css";
import Practice from "./ui/views/Practice.svelte";

// Written for this project. Lesson text replaces it in milestone 5.
const PASSAGE =
  "The river bends twice before it reaches the old mill, where the water slows and the light falls through the trees. Keep your hands relaxed, look at the text, and let each word arrive at its own pace.";
</script>

<Practice text={PASSAGE} errorMode="stop" />

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
  }
</style>
