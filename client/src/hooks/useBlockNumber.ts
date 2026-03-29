import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

/** Poll latest block for a lightweight “live chain” indicator */
export function useBlockNumber(intervalMs = 12000) {
  const { provider } = useWallet();
  const [block, setBlock] = useState<number | null>(null);

  useEffect(() => {
    if (!provider) {
      setBlock(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await provider.getBlockNumber();
        if (!cancelled) setBlock(n);
      } catch {
        if (!cancelled) setBlock(null);
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [provider, intervalMs]);

  return block;
}
