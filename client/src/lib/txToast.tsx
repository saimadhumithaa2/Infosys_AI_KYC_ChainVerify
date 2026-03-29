import { toast } from "sonner";
import { etherscanTxUrl } from "@/lib/constants";

export function notifyTxSubmitted(hash: string) {
  toast.success("Transaction submitted", {
    description: (
      <a
        href={etherscanTxUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className="text-violet-400 underline underline-offset-2"
      >
        View on Etherscan →
      </a>
    ),
    duration: 8000,
  });
}

export function notifyTxError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  toast.error("Transaction failed", { description: msg });
}

export function notifyInfo(title: string, description?: string) {
  toast(title, { description });
}
