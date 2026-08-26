<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../stylesheets/app.css";
  import { Header, Footer } from "$lib";
  import { toasts } from "$lib";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
  <Header />
  {@render children()}
  <Footer />
</div>

<div class="toasts">
  <div class="toasts-region" role="status" aria-live="polite">
    {#each $toasts.filter((t) => t.type !== "error") as toast (toast.id)}
      <button
        class="toast toast-{toast.type}"
        onclick={() => toasts.dismiss(toast.id)}
        onmouseenter={() => toasts.pause(toast.id)}
        onmouseleave={() => toasts.resume(toast.id)}
      >
        {toast.message}
      </button>
    {/each}
  </div>
  <div class="toasts-region" role="alert" aria-live="assertive">
    {#each $toasts.filter((t) => t.type === "error") as toast (toast.id)}
      <button
        class="toast toast-{toast.type}"
        onclick={() => toasts.dismiss(toast.id)}
        onmouseenter={() => toasts.pause(toast.id)}
        onmouseleave={() => toasts.resume(toast.id)}
      >
        {toast.message}
      </button>
    {/each}
  </div>
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
  }

  .toasts-region {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toast {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-width: 16.25rem;
    box-shadow: var(--shadow);
  }

  .toast-info {
    background: var(--toast-info);
  }

  .toast-warning {
    background: var(--toast-warning);
  }

  .toast-error {
    background: var(--toast-error);
  }

  .app-shell {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
  }
</style>
