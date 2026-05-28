import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { matchesIpList } from "../utils/ip.js";

export function evaluateIpRules(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  if (matchesIpList(req.ip, config.ip.allow)) {
    return {
      action: "allow",
      statusCode: 200,
      reason: "IP allowlisted",
      ruleId: "ip.allow",
      score: 0
    };
  }

  if (matchesIpList(req.ip, config.ip.block)) {
    return {
      action: "block",
      statusCode: config.response.blockStatusCode,
      reason: "IP blocklisted",
      ruleId: "ip.block",
      score: 100
    };
  }

  return undefined;
}
