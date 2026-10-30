<script lang="ts">
import "./ui/styles/tokens.css";
</script>

<main>
  <h1>Tenfold</h1>
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
  }

  main {
    display: grid;
    min-height: 100vh;
    place-items: center;
  }

  h1 {
    margin: 0;
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }
</style>
