export function isAbortError(value: unknown): value is DOMException {
  return (
    value instanceof DOMException &&
    value.name === "AbortError"
  );
}

/**
 * Safely start audio playback without throwing on expected AbortError race conditions.
 */
export async function safeAudioPlay(audio: HTMLAudioElement | null): Promise<boolean> {
  if (!audio) {
    return false;
  }

  if (!audio.paused) {
    return true;
  }

  try {
    const result = audio.play();

    if (result instanceof Promise) {
      await result;
    }

    return true;
  } catch (error) {
    if (isAbortError(error)) {
      return false;
    }

    console.warn("[safeAudioPlay] audio playback failed", error);
    return false;
  }
}

/**
 * Safely pause audio playback and ignore invalid state errors.
 */
export function safeAudioPause(audio: HTMLAudioElement | null): void {
  if (!audio || audio.paused) {
    return;
  }

  try {
    audio.pause();
  } catch (error) {
    console.warn("[safeAudioPause] audio pause failed", error);
  }
}

/**
 * Helper that transitions audio from paused to playing or stops it when already playing.
 */
export async function safeAudioToggle(audio: HTMLAudioElement | null): Promise<boolean> {
  if (!audio) {
    return false;
  }

  if (audio.paused) {
    return safeAudioPlay(audio);
  }

  safeAudioPause(audio);
  return false;
}
