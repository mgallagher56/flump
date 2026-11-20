import { isIPv4, isIPv6 } from "node:net";

/** The one key every value that is not an address shares, so a bad value never gets its own. */
const INVALID_KEY = "invalid";

/**
 * Rate-limit key for a client address. IPv6 clients are keyed by their /64, because one
 * subscriber normally owns a whole /64 and could otherwise rotate addresses to dodge the limit.
 * IPv4-mapped IPv6 (::ffff:a.b.c.d, in any spelling) is keyed as the IPv4 address.
 *
 * One address always gives one key, however it is written: the IPv6 text is first put in its
 * canonical form (lower case, no leading zeros, a dotted IPv4 tail as its two hex groups), and a
 * zone id (%eth0) is dropped. A value that is not an address gets the single shared key
 * "invalid", never a key of its own.
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return "unknown";
  if (isIPv4(ip)) return ip;
  const zone = ip.indexOf("%");
  const bare = zone === -1 ? ip : ip.slice(0, zone);
  if (zone === 0 || zone === ip.length - 1 || !isIPv6(bare)) return INVALID_KEY;

  const groups = expandIPv6(bare);
  if (!groups) return INVALID_KEY;
  // ::ffff:0:0/96: 80 zero bits, then ffff, then the IPv4 address (RFC 4291 section 2.5.5.2).
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    const [hi = 0, lo = 0] = groups.slice(6);
    return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join(".");
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(":")}::/64`;
}

/**
 * The eight 16-bit groups of a valid IPv6 address. The WHATWG URL parser writes the host in
 * canonical form, turning a dotted IPv4 tail into two hex groups, so only `::` is left to expand.
 */
function expandIPv6(address: string): number[] | null {
  let canonical: string;
  try {
    canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const [head = "", tail = ""] = canonical.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = canonical.includes("::") && tail ? tail.split(":") : [];
  const zeros = Array<string>(8 - headGroups.length - tailGroups.length).fill("0");
  const groups = [...headGroups, ...zeros, ...tailGroups].map((g) => Number.parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}
