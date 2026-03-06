import { useState, useCallback, useRef } from "react";
import type { PlatformVariants, PlatformId } from "@/services/socialFormatter";

export type SocialVariantsStatus = "idle" | "loading" | "loaded" | "error";

interface SocialVariantsState {
  status: SocialVariantsStatus;
  variants: PlatformVariants | null;
  images: Record<string, string> | null;
  error: string | null;
}

export function useSocialVariants() {
  const [state, setState] = useState<SocialVariantsState>({
    status: "idle",
    variants: null,
    images: null,
    error: null,
  });

  // Cache keyed by imageUrl to avoid re-fetching for the same result
  const cacheRef = useRef<
    Map<string, { variants: PlatformVariants; images: Record<string, string> }>
  >(new Map());

  const generate = useCallback(
    async (caption: string, imageUrl: string, topic: string) => {
      // Check cache first
      const cached = cacheRef.current.get(imageUrl);
      if (cached) {
        setState({
          status: "loaded",
          variants: cached.variants,
          images: cached.images,
          error: null,
        });
        return;
      }

      setState({ status: "loading", variants: null, images: null, error: null });

      try {
        const res = await fetch("/api/social-format", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption, imageUrl, topic }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to generate variants");
        }

        const data = await res.json();
        const { variants, images } = data as {
          variants: PlatformVariants;
          images: Record<string, string>;
        };

        // Store in cache
        cacheRef.current.set(imageUrl, { variants, images });

        setState({ status: "loaded", variants, images, error: null });
      } catch (err) {
        setState({
          status: "error",
          variants: null,
          images: null,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: "idle", variants: null, images: null, error: null });
  }, []);

  return { ...state, generate, reset };
}

export type { PlatformVariants, PlatformId };
