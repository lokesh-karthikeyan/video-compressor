<script lang="ts">
  import { auth } from "$lib";

  const handleSignout = (): void => auth.logout();
</script>

<header class="site-header">
  <h1 class="brand">
    <a href="/">Video Compressor</a>
  </h1>

  <nav class="actions">
    {#if $auth.user}
      <button class="btn btn-peach" onclick={handleSignout}>
        <svg
          width="1.1em"
          height="1.1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
          ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
            cx="12"
            cy="7"
            r="4"
          /></svg
        >
        Sign out
      </button>
    {:else}
      <a class="btn btn-mint" href="/login">
        <svg
          width="1.1em"
          height="1.1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
          ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
            cx="12"
            cy="7"
            r="4"
          /></svg
        >
        Sign in
      </a>
    {/if}
  </nav>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding-block: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg);
    flex: 0 0 auto;
  }

  .brand {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--primary-strong);
    margin: 0;

    a {
      color: inherit;
      text-decoration: none;
    }
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 100rem;
    font: inherit;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .btn-mint {
    background: var(--mint);
    color: #2f5d4d;
  }

  .btn-peach {
    background: var(--peach);
    color: #7a4632;
  }
</style>
