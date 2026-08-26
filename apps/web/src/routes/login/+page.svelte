<script lang="ts">
  import { goto } from "$app/navigation";
  import { auth } from "$lib";

  let mode = $state<"login" | "register">("login");
  let email: string = $state("");
  let name: string = $state("");
  let password: string = $state("");
  let error: string = $state("");
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (loading) return;

    error = "";
    loading = true;

    try {
      if (mode === "login") await auth.login(email, password);
      else await auth.register(email, name, password);
      goto("/");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<main>
  <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>

  <form onsubmit={handleSubmit}>
    <label>
      Email
      <input type="email" bind:value={email} required autocomplete="email" />
    </label>

    {#if mode === "register"}
      <label>
        Name
        <input type="text" bind:value={name} required autocomplete="name" />
      </label>
    {/if}

    <label>
      Password
      <input
        type="password"
        bind:value={password}
        required
        minlength={mode === "register" ? 8 : 1}
        autocomplete={mode === "login" ? "current-password" : "new-password"}
      />
    </label>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button type="submit" class="btn-mint" disabled={loading}>
      {#if loading}
        {mode === "login" ? "Signing in…" : "Creating account…"}
      {:else}
        {mode === "login" ? "Sign in" : "Sign up"}
      {/if}
    </button>
  </form>

  <p class="toggle">
    {#if mode === "login"}
      No account? <button type="button" onclick={() => (mode = "register")}>Register</button>
    {:else}
      Have an account? <button type="button" onclick={() => (mode = "login")}>Sign in</button>
    {/if}
  </p>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
  }

  h2 {
    margin-bottom: 1rem;
    color: var(--primary-strong);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-weight: 600;
  }

  input {
    padding: 0.6rem 0.75rem;
    border: 1px solid #e3dcef;
    border-radius: var(--radius);
    font: inherit;
    color: var(--text);
  }

  .btn-mint {
    padding: 0.6rem 1rem;
    border: none;
    border-radius: 100rem;
    background: var(--mint);
    color: #2f5d4d;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-mint:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .error {
    color: #c0392b;
    font-size: 0.9rem;
  }

  .toggle {
    margin-top: 1rem;
    color: var(--muted);
  }

  .toggle button {
    background: none;
    border: none;
    color: var(--primary-strong);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
  }
</style>
