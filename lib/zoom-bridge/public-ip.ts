import { isIP } from "node:net"

export function publicIpv4(value: unknown): string {
  if (typeof value !== "string" || isIP(value.trim()) !== 4) throw new Error("Enter a public IPv4 address, without a port or /range.")
  const ip = value.trim()
  const [a, b, c] = ip.split(".").map(Number)
  if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113)) throw new Error("Use the encoder’s public internet IPv4 address, not a local or reserved address.")
  return ip
}
