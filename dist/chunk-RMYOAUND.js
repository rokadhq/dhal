// src/ci.ts
function evaluateDhalCiPolicy(config) {
  const findings = [];
  if (config.policy.ci.failOnModes.includes(config.mode)) {
    findings.push({
      level: "error",
      code: "mode.disallowed",
      message: `Global mode '${config.mode}' is disallowed by policy.ci.failOnModes.`
    });
  }
  if (config.observability.webhooks.enabled && config.policy.ci.requireWebhookSigning && !config.observability.webhooks.signing.enabled) {
    findings.push({
      level: "error",
      code: "webhooks.unsigned",
      message: "Webhook alerts are enabled but HMAC signing is disabled."
    });
  }
  if (config.policy.ci.disallowExpiredSuppressions) {
    const now = Date.now();
    for (const suppression of config.policy.suppressions) {
      if (suppression.expiresAt && Date.parse(suppression.expiresAt) < now) {
        findings.push({
          level: "error",
          code: "suppression.expired",
          message: `Suppression '${suppression.id}' expired at ${suppression.expiresAt}.`
        });
      }
    }
  }
  for (const suppression of config.policy.suppressions) {
    if (suppression.enabled && !suppression.expiresAt) {
      findings.push({
        level: "warning",
        code: "suppression.no_expiry",
        message: `Suppression '${suppression.id}' has no expiresAt. Prefer time-bounded suppressions.`
      });
    }
  }
  for (const ruleName of config.policy.ci.requireNonMonitorRouteForRules) {
    if (!isRuleEnabled(ruleName, config)) continue;
    const hasProtectiveRoute = Object.values(config.routes).some((profile) => profile.enabled !== false && (profile.mode === "block" || profile.mode === "strict"));
    if (!hasProtectiveRoute && config.mode !== "block" && config.mode !== "strict") {
      findings.push({
        level: "error",
        code: "route.no_enforced_profile",
        message: `Rule '${ruleName}' is enabled, but no global or route profile is in block/strict mode.`
      });
    }
  }
  if (config.ip.reputation.enabled && config.ip.reputation.mode === "blocking" && config.ip.reputation.timeoutMs > 1e3) {
    findings.push({
      level: "warning",
      code: "reputation.high_timeout",
      message: "Blocking IP reputation timeout is above 1000ms; this can add request latency."
    });
  }
  return {
    ok: findings.every((finding) => finding.level !== "error"),
    findings
  };
}
function isRuleEnabled(ruleName, config) {
  switch (ruleName) {
    case "credentialStuffing":
      return config.rules.credentialStuffing.enabled;
    case "bot":
      return config.rules.bot.enabled;
    case "honeypot":
      return config.rules.honeypot.enabled;
    case "sqli":
      return config.rules.sqli;
    case "xss":
      return config.rules.xss;
    case "pathTraversal":
      return config.rules.pathTraversal;
    case "badUserAgents":
      return config.rules.badUserAgents;
    default:
      return false;
  }
}

export {
  evaluateDhalCiPolicy
};
