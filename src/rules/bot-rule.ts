import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { getHeader, isPrivateIp } from "../utils/ip.js";
import { matchesRoutePattern } from "../utils/route.js";

export function evaluateBotRule(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const rule = config.rules.bot;
  if (!rule.enabled) return undefined;

  const controls = rule.falsePositiveControls;
  const path = req.route ?? req.path;

  if (controls.skipStaticAssets && isStaticAssetPath(req.path)) return undefined;
  if (controls.ignorePrivateIps && isPrivateIp(req.ip)) return undefined;
  if (controls.ignorePaths.some((pattern) => matchesRoutePattern(path, pattern) || matchesRoutePattern(req.path, pattern))) {
    return undefined;
  }

  const userAgent = getHeader(req.headers, "user-agent") ?? "";
  const lowerUserAgent = userAgent.toLowerCase();
  const allowHit = rule.allowUserAgents.some((pattern) => lowerUserAgent.includes(pattern.toLowerCase()));
  if (allowHit) return undefined;

  const signals: Array<{ name: string; score: number; detail?: string | undefined }> = [];

  if (!userAgent.trim()) {
    signals.push({ name: "empty_user_agent", score: rule.signals.emptyUserAgentScore });
  }

  const suspiciousPattern = rule.suspiciousUserAgents.find((pattern) => lowerUserAgent.includes(pattern.toLowerCase()));
  if (suspiciousPattern) {
    signals.push({ name: "suspicious_user_agent", score: rule.signals.suspiciousUserAgentScore, detail: suspiciousPattern });
  }

  if (!getHeader(req.headers, "accept")) {
    signals.push({ name: "missing_accept_header", score: rule.signals.missingAcceptHeaderScore });
  }

  if (hasAnyHeader(req, ["x-phantomjs", "x-headless", "x-playwright", "x-puppeteer", "sec-ch-ua-full-version-list"]) && /headless|phantom|playwright|puppeteer/i.test(userAgent)) {
    signals.push({ name: "headless_browser_hint", score: rule.signals.headlessHeaderScore });
  }

  if (hasAnyHeader(req, ["x-automated", "x-bot", "x-scraper", "x-crawler"])) {
    signals.push({ name: "automation_header", score: rule.signals.automationHeaderScore });
  }

  if (looksLikeBrowser(userAgent) && !getHeader(req.headers, "accept-language") && !getHeader(req.headers, "sec-fetch-site")) {
    signals.push({ name: "browser_header_mismatch", score: rule.signals.browserHeaderMismatchScore });
  }

  const score = Math.min(100, signals.reduce((sum, signal) => sum + signal.score, 0));
  const hasEnoughSignals = signals.length >= controls.minSignals;
  const explicitEmptyUserAgentBlock = rule.blockEmptyUserAgent && !userAgent.trim();
  const shouldBlock = explicitEmptyUserAgentBlock || (score >= rule.scoreThreshold && hasEnoughSignals);

  if (!shouldBlock) return undefined;

  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason: "Suspicious bot-like request behavior",
    ruleId: "bot.suspicious_request",
    score,
    meta: {
      threatKind: "bot",
      signals,
      signalCount: signals.length,
      minSignals: controls.minSignals,
      userAgent: userAgent || "<empty>"
    }
  };
}

function hasAnyHeader(req: DhalRequest, names: string[]): boolean {
  return names.some((name) => getHeader(req.headers, name) !== undefined);
}

function looksLikeBrowser(userAgent: string): boolean {
  return /mozilla|chrome|safari|firefox|edge|edg\//i.test(userAgent);
}

function isStaticAssetPath(path: string): boolean {
  return /\.(?:avif|css|gif|ico|jpeg|jpg|js|map|png|svg|txt|webp|woff2?)$/i.test(path);
}
