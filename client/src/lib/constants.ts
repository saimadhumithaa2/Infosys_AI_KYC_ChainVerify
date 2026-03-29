export const SEPOLIA_CHAIN_ID = 11155111n;

export function etherscanTxUrl(txHash: string) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function etherscanAddressUrl(address: string) {
  return `https://sepolia.etherscan.io/address/${address}`;
}

/** API base: Vite proxy strips /api → backend */
export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/api${p}`;
}
