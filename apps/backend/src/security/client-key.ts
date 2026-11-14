import { isIPv6 } from "node:net";

/**
 * Rate-limit key for a client address. IPv6 clients are keyed by their /64, because one
 * subscriber normally owns a whole /64 and could otherwise rotate addresses to dodge the limit.
 * IPv4-mapped IPv6 (::ffff:a.b.c.d) is keyed as the IPv4 address.
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return "unknown";
  const mappedV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mappedV4) return mappedV4;
  const bare = ip.split("%")[0] ?? ip;
  if (!isIPv6(bare)) return ip;

  const compressed = bare.includes("::");
  const [head, tail = ""] = bare.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = compressed && tail ? tail.split(":") : [];
  const missing = compressed ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...Array(Math.max(0, missing)).fill("0"), ...tailGroups];
  const prefix = groups
    .slice(0, 4)
    .map((g) => Number.parseInt(g, 16).toString(16))
    .join(":");
  return `${prefix}::/64`;
}
