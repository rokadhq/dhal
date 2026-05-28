import { P as PartialDeep, f as DhalConfig, c as DhalAutosetupOptions } from '../types-CX1y5ozy.cjs';

type ProjectScanFile = {
    path: string;
    bytes: number;
    language: string;
    snippet: string;
    findings: string[];
};
type ProjectScan = {
    root: string;
    frameworkHints: string[];
    packageHints: string[];
    files: ProjectScanFile[];
    routes: Array<{
        method: string;
        path: string;
        source: string;
        risk: string[];
    }>;
};

type AutosetupProposal = {
    config: PartialDeep<DhalConfig>;
    rationale: string[];
    warnings: string[];
};

type DhalAutosetupResult = {
    scan: Omit<ProjectScan, "files"> & {
        files: Array<Omit<ProjectScan["files"][number], "snippet">>;
    };
    provider: string;
    model: string;
    usedAi: boolean;
    wroteConfig: boolean;
    outputPath?: string | undefined;
    proposal: AutosetupProposal;
};
declare function runDhalAutosetup(options: DhalAutosetupOptions): Promise<DhalAutosetupResult>;

export { type DhalAutosetupResult, runDhalAutosetup };
