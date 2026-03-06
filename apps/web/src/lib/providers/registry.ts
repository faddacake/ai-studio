import type { ProviderAdapter } from "./types";
import { FalAdapter } from "./fal.adapter";
import { ReplicateAdapter } from "./replicate.adapter";
import { GoogleAdapter } from "./google.adapter";

export const providerRegistry: Record<string, ProviderAdapter> = {
  fal: new FalAdapter(),
  replicate: new ReplicateAdapter(),
  google: new GoogleAdapter(),
};

export type ProviderKey = keyof typeof providerRegistry;
