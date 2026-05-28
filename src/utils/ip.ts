import { isIP } from "node:net";
import type { DhalHeaders } from "../types.js";

export function normalizeIp(ip: string | undefined): string {
  if (!ip) return "0.0.0.0";

  const cleaned = ip.trim().replace(/^\[|\]$/g, "").replace(/^::ffff:/, "");
  if (cleaned === "::1") return "::1";
  return cleaned;
}

export function getHeader(headers: DhalHeaders, name: string): string | undefined {
  const lower = name.toLowerCase();
  const direct = headers[lower] ?? headers[name];
  if (Array.isArray(direct)) return direct[0];
  if (direct !== undefined) return direct;

  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lower)?.[1];
  if (Array.isArray(found)) return found[0];
  return found;
}

export function extractClientIp(args: {
  socketIp?: string | undefined;
  headers: DhalHeaders;
  trustProxy: boolean;
}): string {
  if (args.trustProxy) {
    const forwardedFor = getHeader(args.headers, "x-forwarded-for");
    if (forwardedFor) {
      const first = forwardedFor.split(",")[0]?.trim();
      if (first) return normalizeIp(first);
    }

    const realIp = getHeader(args.headers, "x-real-ip");
    if (realIp) return normalizeIp(realIp);
  }

  return normalizeIp(args.socketIp);
}

export function matchesIpList(ip: string, patterns: string[]): boolean {
  const normalized = normalizeIp(ip);
  return patterns.some((pattern) => matchesIpPattern(normalized, pattern));
}

function matchesIpPattern(ip: string, pattern: string): boolean {
  const normalizedPattern = normalizeIp(pattern);

  if (normalizedPattern === ip) return true;

  if (normalizedPattern.includes("/")) {
    return matchesCidr(ip, normalizedPattern);
  }

  // Lightweight wildcard support for simple local configs: 10.0.*.*
  if (normalizedPattern.includes("*") && isIP(ip) === 4) {
    const regex = new RegExp(
      `^${normalizedPattern
        .split(".")
        .map((part) => (part === "*" ? "\\d{1,3}" : escapeRegex(part)))
        .join("\\.")}$`
    );
    return regex.test(ip);
  }

  return false;
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  if (!range || bitsRaw === undefined) return false;

  const bits = Number(bitsRaw);
  const family = isIP(range);
  if (!Number.isInteger(bits) || family === 0) return false;

  if (family === 4) {
    if (bits < 0 || bits > 32) return false;
    const ipNum = ipv4ToBigInt(ip);
    const rangeNum = ipv4ToBigInt(range);
    if (ipNum === null || rangeNum === null) return false;
    return matchesBigIntCidr(ipNum, rangeNum, bits, 32);
  }

  if (bits < 0 || bits > 128) return false;
  const ipNum = ipv6ToBigInt(ip);
  const rangeNum = ipv6ToBigInt(range);
  if (ipNum === null || rangeNum === null) return false;
  return matchesBigIntCidr(ipNum, rangeNum, bits, 128);
}

function matchesBigIntCidr(ip: bigint, range: bigint, bits: number, width: number): boolean {
  if (bits === 0) return true;
  const shift = BigInt(width - bits);
  return (ip >> shift) === (range >> shift);
}

function ipv4ToBigInt(ip: string): bigint | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return BigInt((((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0);
}

function ipv6ToBigInt(ip: string): bigint | null {
  if (isIP(ip) !== 6) return null;

  const normalized = expandIpv6(ip);
  if (!normalized) return null;

  return normalized.reduce((acc, group) => (acc << 16n) + BigInt(group), 0n);
}

function expandIpv6(ip: string): number[] | null {
  const [headRaw = "", tailRaw = ""] = ip.split("::");
  if (ip.split("::").length > 2) return null;

  const head = parseIpv6Groups(headRaw);
  const tail = parseIpv6Groups(tailRaw);
  if (!head || !tail) return null;

  if (ip.includes("::")) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    return [...head, ...Array.from({ length: missing }, () => 0), ...tail];
  }

  return head.length === 8 ? head : null;
}

function parseIpv6Groups(value: string): number[] | null {
  if (!value) return [];
  const groups = value.split(":");
  const output: number[] = [];

  for (const group of groups) {
    if (group.includes(".")) {
      const ipv4 = ipv4ToBigInt(group);
      if (ipv4 === null) return null;
      output.push(Number((ipv4 >> 16n) & 0xffffn), Number(ipv4 & 0xffffn));
      continue;
    }

    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    output.push(Number.parseInt(group, 16));
  }

  return output;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (normalized === "::1" || normalized === "localhost") return true;

  if (isIP(normalized) === 6) {
    return matchesIpList(normalized, ["fc00::/7", "fe80::/10", "::1/128"]);
  }

  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}
