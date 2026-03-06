import { useState, useEffect } from "react";
import type { LicenseTier, TierLimits } from "@/lib/license-tiers";
import { TIER_LIMITS } from "@/lib/license-tiers";

interface LicenseState {
  tier: LicenseTier;
  limits: TierLimits;
  loading: boolean;
}

/**
 * Fetches the current license tier from the server.
 * Defaults to "creator" while loading to avoid flash of locked UI.
 */
export function useLicenseTier(): LicenseState {
  const [state, setState] = useState<LicenseState>({
    tier: "creator",
    limits: TIER_LIMITS.creator,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/license")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.tier && data.limits) {
          setState({ tier: data.tier, limits: data.limits, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false }));
        }
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
