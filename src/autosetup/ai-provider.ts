import type { DhalAutosetupOptions } from "../types.js";

export async function createAiSdkModel(options: Pick<DhalAutosetupOptions, "provider" | "model" | "providerModule" | "providerExport">): Promise<unknown> {
  switch (options.provider) {
    case "gateway":
      return options.model;
    case "openai": {
      const mod = await import("@ai-sdk/openai");
      return mod.openai(options.model);
    }
    case "anthropic": {
      const mod = await import("@ai-sdk/anthropic");
      return mod.anthropic(options.model);
    }
    case "google": {
      const mod = await import("@ai-sdk/google");
      return mod.google(options.model);
    }
    case "mistral": {
      const mod = await import("@ai-sdk/mistral");
      return mod.mistral(options.model);
    }
    case "xai": {
      const mod = await import("@ai-sdk/xai");
      return mod.xai(options.model);
    }
    case "custom": {
      if (!options.providerModule) throw new Error("--provider-module is required when --provider custom is used");
      const mod = await import(options.providerModule);
      const exported = options.providerExport ? mod[options.providerExport] : mod.default;
      if (typeof exported !== "function") throw new Error("Custom provider export must be a function that accepts a model id");
      return exported(options.model);
    }
    default:
      throw new Error(`Unsupported AI provider: ${String(options.provider)}`);
  }
}
