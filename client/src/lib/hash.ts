import { ethers } from "ethers";

/** Deterministic JSON stringify for metadata hashing */
export function canonicalStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

/** SHA-256 digest; `bytes32` is the on-chain value for `registerKYC`. */
export function hashMetadata(metadata: Record<string, unknown>) {
  const s = canonicalStringify(metadata);
  const hex = ethers.sha256(ethers.toUtf8Bytes(s));
  return { string: s, sha256Hex: hex.slice(2), bytes32: hex };
}
