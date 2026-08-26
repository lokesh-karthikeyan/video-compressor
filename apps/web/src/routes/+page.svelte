<script lang="ts">
  import { toasts, auth, rateLimiter, PRESETS, CUSTOM_DEFAULTS, MESSAGES, api } from "$lib";
  import type { Preset, CustomSettings, CompressOptions } from "$lib";

  let file = $state<File | null>(null);
  let selectedPreset = $state<Preset | null>(PRESETS[0]);
  let customSettings = $state<CustomSettings>({ ...CUSTOM_DEFAULTS });
  let startTime = $state("");
  let endTime = $state("");
  let cropW = $state("");
  let cropH = $state("");
  let cropX = $state("");
  let cropY = $state("");
  let compressing = $state(false);
  let progress = $state(0);
  let resultUrl = $state<string | null>(null);
  let abortController = $state<AbortController | null>(null);
  let videoId = $state<string | null>(null);
  let serverStatus = $state<"idle" | "uploading" | "processing" | "completed" | "failed">("idle");
  let serverProgress = $state(0);
  let downloadUrl = $state<string | null>(null);
  let pollTimer = $state<ReturnType<typeof setInterval> | null>(null);

  const MAX_POLL_FAILURES = 5;
  const MAX_POLL_DURATION_MS = 30 * 60 * 1000;
  let pollFailures = 0;
  let pollStartTime = 0;

  $effect(() => {
    return () => {
      stopPoll();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  });

  const isAuthenticated = $derived(!!$auth.user);

  const compressedFileName = $derived.by(() => {
    if (!file) return "compressed.mp4";
    const dot = file.name.lastIndexOf(".");
    if (dot <= 0) return `${file.name}-compressed.mp4`;
    return `${file.name.slice(0, dot)}-compressed${file.name.slice(dot)}`;
  });

  const progressValue = $derived(
    compressing ? (isAuthenticated ? serverProgress : progress) : 0,
  );

  const compressLabel = $derived.by(() => {
    if (!compressing) return "Compress Video";
    if (!isAuthenticated) return `Compressing Video… ${Math.round(progress * 100)}%`;
    if (serverStatus === "uploading") return "Uploading…";
    if (serverStatus === "processing") return `Processing… ${Math.round(serverProgress * 100)}%`;
    return "Compressing…";
  });

  const handleFileSelect = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    file = input.files?.[0] ?? null;
    if (!file) return;

    const check = rateLimiter.canCompress(file.size, isAuthenticated);
    if (!check.ok) {
      toasts.show(check.reason!, "warning");
      file = null;
    }
  };

  const clearEdits = (): void => {
    startTime = "";
    endTime = "";
    cropW = "";
    cropH = "";
    cropX = "";
    cropY = "";
  };

  const guardEdit = (msg: string): boolean => {
    if (isAuthenticated) return true;
    toasts.show(msg, "warning");
    clearEdits();
    return false;
  };

  const handleTrim = (): void => {
    if (!guardEdit(MESSAGES.SIGN_IN_FOR_TRIM)) return;
  };

  const handleCrop = (): void => {
    if (!guardEdit(MESSAGES.SIGN_IN_FOR_CROP)) return;
  };

  const selectPreset = (preset: Preset | null): void => {
    selectedPreset = preset;
  };

  const buildOptions = (): CompressOptions => {
    const crf = selectedPreset ? selectedPreset.crf : customSettings.crf;
    const maxResolution = selectedPreset
      ? selectedPreset.maxResolution
      : customSettings.maxResolution;
    const opts: CompressOptions = {
      crf,
      maxResolution,
      ...(selectedPreset?.targetSizeBytes
        ? { targetSizeBytes: selectedPreset.targetSizeBytes }
        : {}),
    };

    if (isAuthenticated) {
      if (startTime) opts.start = startTime;
      if (endTime) opts.end = endTime;
      if (+cropW > 0 && +cropH > 0) {
        opts.crop = { w: +cropW, h: +cropH, x: +cropX, y: +cropY };
      }
    }

    return opts;
  };

  async function handleCompress(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!file) return;

    if (
      !isAuthenticated &&
      (startTime || endTime || +cropW > 0 || +cropH > 0 || +cropX > 0 || +cropY > 0)
    ) {
      toasts.show(MESSAGES.SIGN_IN_FOR_EDIT, "warning");
      return;
    }

    if (isAuthenticated) {
      await handleServerCompress();
    } else {
      await handleBrowserCompress();
    }
  }

  async function handleBrowserCompress() {
    compressing = true;
    progress = 0;
    abortController = new AbortController();

    try {
      const { compressVideo } = await import("$lib/ffmpeg/compressor");
      const blob = await compressVideo(
        file!,
        buildOptions(),
        (p) => (progress = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))),
        abortController.signal,
      );
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      rateLimiter.recordCompression();
      toasts.show("Compression complete", "info");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toasts.show("Compression cancelled", "info");
      } else {
        console.error("[compress] error:", error);
        toasts.show("Compression failed", "error");
      }
    } finally {
      compressing = false;
      abortController = null;
    }
  }

  function handleCancel(): void {
    abortController?.abort();
  }

  async function handleServerCompress(): Promise<void> {
    compressing = true;
    serverStatus = "uploading";
    serverProgress = 0;
    downloadUrl = null;

    try {
      const { video, uploadUrl } = await api.createVideo({
        filename: file!.name,
        fileSize: file!.size,
        contentType: file!.type || "video/mp4",
        options: buildOptions(),
      });
      videoId = video.id;

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file!.type || "video/mp4" },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      await api.confirmUpload(videoId);
      serverStatus = "processing";

      pollStartTime = Date.now();
      pollFailures = 0;
      pollTimer = setInterval(pollVideoStatus, 3000);
    } catch (error) {
      console.error("[server compress]", error);
      toasts.show("Compression failed", "error");
      compressing = false;
      serverStatus = "idle";
      videoId = null;
    }
  }

  async function pollVideoStatus(): Promise<void> {
    if (!videoId) return;

    if (Date.now() - pollStartTime > MAX_POLL_DURATION_MS) {
      stopPoll();
      serverStatus = "failed";
      compressing = false;
      videoId = null;
      toasts.show("Processing timed out", "error");
      return;
    }

    try {
      const video = await api.getVideo(videoId);
      pollFailures = 0;
      serverProgress = video.progress;

      if (video.status === "completed") {
        stopPoll();
        downloadUrl = video.downloadUrl ?? null;
        serverStatus = "completed";
        compressing = false;
        rateLimiter.recordCompression();
        toasts.show("Compression complete", "info");
      } else if (video.status === "failed") {
        stopPoll();
        serverStatus = "failed";
        compressing = false;
        toasts.show(video.errorMessage || "Compression failed", "error");
      }
    } catch (error) {
      pollFailures++;
      console.error("[poll]", error);
      if (pollFailures >= MAX_POLL_FAILURES) {
        stopPoll();
        serverStatus = "failed";
        compressing = false;
        toasts.show("Lost connection to server", "error");
      }
    }
  }

  function stopPoll(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
</script>

<main>
  <label class="dropzone">
    <input type="file" accept="video/*" onchange={handleFileSelect} class="visually-hidden" />
    <svg
      width="2.5rem"
      height="2.5rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
      ><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path
        d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
      /></svg
    >
    <span>Drag &amp; drop a video, or click to browse</span>
    {#if file}<p class="file-name">{file.name}</p>{/if}
  </label>

  {#if file}
    <form class="video-compressor--form" onsubmit={handleCompress}>
      <details class="available-presets--dropdown" open>
        <summary class="available-presets--summary">Available Presets</summary>
        {#each PRESETS as preset (preset.id)}
          <label class:selected={selectedPreset?.id === preset.id}>
            <input
              type="radio"
              name="preset"
              checked={selectedPreset?.id === preset.id}
              onclick={() => selectPreset(preset)}
            />
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </label>
        {/each}

        <label class:selected={selectedPreset === null}>
          <input
            type="radio"
            name="preset"
            checked={selectedPreset === null}
            onclick={() => selectPreset(null)}
          />
          <strong>Custom</strong>
        </label>
      </details>

      <fieldset disabled={selectedPreset !== null}>
        <legend>Custom Settings (Disabled when preset selected)</legend>
        <label
          >Quality (CRF): {customSettings.crf}
          <input type="range" min="0" max="51" bind:value={customSettings.crf} />
        </label>

        <label
          >Resolution:
          <select bind:value={customSettings.maxResolution}>
            <option value={0}>Original</option>
            <option value={720}>720p</option>
            <option value={1080}>1080p</option>
          </select>
        </label>
      </fieldset>

      <fieldset class="edit-video--fieldset">
        <legend>Edit Video</legend>
        <input
          bind:value={startTime}
          placeholder="Start (HH:MM:SS)"
          onfocus={(event) => {
            if (!guardEdit(MESSAGES.SIGN_IN_FOR_TRIM))
              (event.currentTarget as HTMLInputElement).blur();
          }}
        />
        <input
          bind:value={endTime}
          placeholder="End (HH:MM:SS)"
          onfocus={(event) => {
            if (!guardEdit(MESSAGES.SIGN_IN_FOR_TRIM))
              (event.currentTarget as HTMLInputElement).blur();
          }}
        />
        <div>
          <input
            bind:value={cropW}
            placeholder="W"
            onfocus={(event) => {
              if (!guardEdit(MESSAGES.SIGN_IN_FOR_CROP))
                (event.currentTarget as HTMLInputElement).blur();
            }}
          />
          <input
            bind:value={cropH}
            placeholder="H"
            onfocus={(event) => {
              if (!guardEdit(MESSAGES.SIGN_IN_FOR_CROP))
                (event.currentTarget as HTMLInputElement).blur();
            }}
          />
          <input
            bind:value={cropX}
            placeholder="X"
            onfocus={(event) => {
              if (!guardEdit(MESSAGES.SIGN_IN_FOR_CROP))
                (event.currentTarget as HTMLInputElement).blur();
            }}
          />
          <input
            bind:value={cropY}
            placeholder="Y"
            onfocus={(event) => {
              if (!guardEdit(MESSAGES.SIGN_IN_FOR_CROP))
                (event.currentTarget as HTMLInputElement).blur();
            }}
          />
        </div>
        <button type="button" class="btn" onclick={handleTrim}>Apply Trim</button>
        <button type="button" class="btn" onclick={handleCrop}>Apply Crop</button>
      </fieldset>

      <div class="compress-actions">
        <button
          type="submit"
          class="btn btn-primary"
          class:loading={compressing}
          disabled={compressing}
        >
          <span class="btn-label">{compressLabel}</span>
          {#if compressing}
            <span class="btn-progress" style="width: {Math.round(progressValue * 100)}%"></span>
          {/if}
        </button>
        {#if compressing && !isAuthenticated}
          <button type="button" class="btn btn-cancel" onclick={handleCancel}>Cancel</button>
        {/if}
      </div>

      {#if resultUrl}
        <div class="result">
          <!-- svelte-ignore a11y_media_has_caption -->
          <video src={resultUrl} controls class="preview"></video>
          <a class="btn btn-primary" href={resultUrl} download={compressedFileName}>Download</a>
        </div>
      {/if}

      {#if downloadUrl}
        <div class="result">
          <!-- svelte-ignore a11y_media_has_caption -->
          <video src={downloadUrl} controls class="preview"></video>
          <a class="btn btn-primary" href={downloadUrl} download={compressedFileName}>
            Download
          </a>
        </div>
      {/if}
    </form>
  {/if}
</main>

<style>
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    cursor: pointer;
    text-align: center;
    border: 2px dashed var(--primary);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--primary) 8%, var(--surface));
    color: var(--primary-strong);
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .dropzone:hover {
    background: color-mix(in srgb, var(--primary) 14%, var(--surface));
  }

  .file-name {
    margin-top: 0.5rem;
    font-weight: 600;
    color: var(--text);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  fieldset {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    margin-bottom: 1rem;
  }

  legend {
    padding: 0 0.5rem;
    font-weight: 600;
    color: var(--primary-strong);
  }

  label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    border: none;
    border-radius: 100rem;
    font: inherit;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .btn-primary {
    background: var(--primary);
    color: #3a2f52;
  }

  .btn-primary:hover {
    background: var(--primary-strong);
    color: #fff;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .preview {
    width: 100%;
    border-radius: var(--radius);
    background: #000;
  }

  .video-compressor--form {
    display: flex;
    flex-direction: column;
    gap: 1em;
    margin-block-start: 2em;
  }

  .available-presets--dropdown label {
    padding-inline-start: 1em;
  }

  .available-presets--summary {
    margin-block-end: 1em;
  }

  .video-compressor--form
    input:not([type="file"]):not([type="range"]):not([type="radio"]):not([type="checkbox"]),
  .video-compressor--form select {
    width: 100%;
    padding: 0.55rem 0.75rem;
    margin-bottom: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font: inherit;
    color: var(--text);
    background: var(--surface);
  }

  .video-compressor--form
    input:not([type="file"]):not([type="range"]):not([type="radio"]):not([type="checkbox"]):focus,
  .video-compressor--form select:focus {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
    border-color: var(--primary);
  }

  .video-compressor--form input[type="range"] {
    width: 100%;
    margin: 0.25rem 0 0.75rem;
    accent-color: var(--primary);
  }

  .edit-video--fieldset > div {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .edit-video--fieldset > div input {
    margin: 0;
  }

  .edit-video--fieldset .btn + .btn {
    margin-inline-start: 0.5rem;
  }

  .video-compressor--form fieldset:disabled label {
    color: var(--muted);
  }

  .video-compressor--form fieldset:disabled input,
  .video-compressor--form fieldset:disabled select {
    opacity: 0.6;
  }

  .btn-primary {
    position: relative;
    overflow: hidden;
  }

  .btn-primary .btn-label {
    position: relative;
    z-index: 1;
  }

  .btn-primary .btn-progress {
    position: absolute;
    inset: 0 auto 0 0;
    background: color-mix(in srgb, var(--primary-strong) 50%, transparent);
    transition: width 0.1s linear;
    z-index: 0;
  }

  .btn-primary:disabled {
    cursor: progress;
    opacity: 1;
  }

  .btn-primary.loading {
    background: color-mix(in srgb, var(--primary) 40%, var(--surface));
    color: var(--muted);
  }

  .compress-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }

  .btn-cancel:hover {
    border-color: var(--peach);
    color: var(--peach);
  }
</style>
