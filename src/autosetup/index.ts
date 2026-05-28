import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultConfig, deepMerge, loadDhalConfig } from "../config.js";
import type { DhalAutosetupOptions, DhalConfig, PartialDeep } from "../types.js";
import { buildHeuristicProposal, type AutosetupProposal } from "./heuristics.js";
import { createAiSdkModel } from "./ai-provider.js";
import { scanProject, type ProjectScan } from "./scanner.js";

export type DhalAutosetupResult = {
  scan: Omit<ProjectScan, "files"> & { files: Array<Omit<ProjectScan["files"][number], "snippet">> };
  provider: string;
  model: string;
  usedAi: boolean;
  wroteConfig: boolean;
  outputPath?: string | undefined;
  proposal: AutosetupProposal;
};

export async function runDhalAutosetup(options: DhalAutosetupOptions): Promise<DhalAutosetupResult> {
  const root = resolve(process.cwd(), options.projectRoot);
  const scan = scanProject(root, {
    maxFiles: options.maxFiles,
    maxBytesPerFile: options.maxBytesPerFile
  });

  const heuristic = buildHeuristicProposal(scan);
  const aiResult = options.useAi ? await tryAiProposal(scan, heuristic, options) : { proposal: heuristic, usedAi: false };
  const proposal = aiResult.proposal;
  const outputPath = resolve(root, options.outputPath ?? options.configPath);

  let wroteConfig = false;
  if (options.write) {
    if (existsSync(outputPath) && options.outputPath && outputPath !== resolve(root, options.configPath)) {
      // explicit output files can be overwritten by design
    }
    const existing = existsSync(outputPath) ? loadDhalConfig(outputPath) : defaultConfig;
    const merged = deepMerge(existing, proposal.config) as DhalConfig;
    writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
    wroteConfig = true;
  }

  return {
    scan: redactScan(scan),
    provider: options.provider,
    model: options.model,
    usedAi: aiResult.usedAi,
    wroteConfig,
    outputPath: wroteConfig ? outputPath : undefined,
    proposal
  };
}

async function tryAiProposal(scan: ProjectScan, heuristic: AutosetupProposal, options: DhalAutosetupOptions): Promise<{ proposal: AutosetupProposal; usedAi: boolean }> {
  try {
    const ai = await import("ai");
    const model = await createAiSdkModel(options);
    const result = await ai.generateText({
      model,
      system: "You are a senior application security engineer. Return only strict JSON. Do not include markdown.",
      prompt: buildPrompt(scan, heuristic)
    });

    const parsed = parseJsonObject(result.text) as Partial<AutosetupProposal>;
    const aiConfig = sanitizeConfigPatch(parsed.config ?? {});
    return {
      usedAi: true,
      proposal: {
        config: deepMerge(heuristic.config, aiConfig) as PartialDeep<DhalConfig>,
        rationale: [...heuristic.rationale, ...stringArray(parsed.rationale)],
        warnings: [...heuristic.warnings, ...stringArray(parsed.warnings)]
      }
    };
  } catch (error) {
    return {
      usedAi: false,
      proposal: {
        ...heuristic,
        warnings: [
          ...heuristic.warnings,
          `AI autosetup fell back to deterministic heuristics: ${error instanceof Error ? error.message : String(error)}`
        ]
      }
    };
  }
}

function buildPrompt(scan: ProjectScan, heuristic: AutosetupProposal): string {
  const payload = {
    task: "Review this Node.js project scan and propose a Dhal WAF config. Keep mode monitor globally unless a route is clearly high risk. Prefer route profiles over broad global blocking.",
    allowedConfigShape: {
      mode: "monitor|block|strict|off",
      trustProxy: "boolean",
      rules: "Dhal rules partial patch",
      routes: "map of route pattern to route profile",
      policy: "policy partial patch"
    },
    outputShape: {
      config: "partial Dhal config patch",
      rationale: ["short reasons"],
      warnings: ["manual checks required"]
    },
    scan: {
      frameworkHints: scan.frameworkHints,
      packageHints: scan.packageHints,
      routes: scan.routes,
      files: scan.files.map((file) => ({ path: file.path, findings: file.findings, snippet: file.snippet }))
    },
    heuristicProposal: heuristic
  };

  return JSON.stringify(payload, null, 2);
}

function parseJsonObject(value: string): unknown {
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function sanitizeConfigPatch(value: unknown): PartialDeep<DhalConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clone = JSON.parse(JSON.stringify(value)) as PartialDeep<DhalConfig>;

  // Never allow AI to configure secrets inline.
  if (clone.ip?.reputation && "apiKey" in clone.ip.reputation) {
    delete (clone.ip.reputation as Record<string, unknown>).apiKey;
  }

  return clone;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function redactScan(scan: ProjectScan): DhalAutosetupResult["scan"] {
  return {
    root: scan.root,
    frameworkHints: scan.frameworkHints,
    packageHints: scan.packageHints,
    routes: scan.routes,
    files: scan.files.map(({ snippet: _snippet, ...file }) => file)
  };
}
