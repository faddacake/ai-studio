import { useCallback } from "react";
import type { PlatformVariants } from "@/services/socialFormatter";

/**
 * Lightweight bridge between Prompt and Canvas pages using sessionStorage.
 * No external deps. Data survives client-side navigation but not tab close.
 */

const STORAGE_KEY = "ai-studio:canvas";

export interface CanvasData {
  prompt: string;
  topic: string;
  imageUrl: string;
  modelName: string;
  variants: PlatformVariants;
}

export function saveCanvasData(data: CanvasData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage full or unavailable — silent fail
  }
}

export function loadCanvasData(): CanvasData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CanvasData;
  } catch {
    return null;
  }
}

export function clearCanvasData(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

/** Hook for components that need reactive read + write. */
export function useCanvasStore() {
  const save = useCallback((data: CanvasData) => saveCanvasData(data), []);
  const load = useCallback(() => loadCanvasData(), []);
  const clear = useCallback(() => clearCanvasData(), []);

  return { save, load, clear };
}
