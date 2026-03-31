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
  const msg = formatWalletError(err);
  toast.error("Transaction failed", { description: msg });
}

export function notifyInfo(title: string, description?: string) {
  toast(title, { description });
}

function formatWalletError(err: unknown) {
  const raw = extractRawMessage(err).toLowerCase();

  if (raw.includes("user rejected") || raw.includes("action_rejected") || raw.includes("rejected")) {
    return "You rejected the transaction in MetaMask.";
  }
  if (raw.includes("nonce too low")) {
    return "Nonce mismatch in wallet/network. Open MetaMask on the same network, reset account activity, and try again.";
  }
  if (raw.includes("replacement transaction underpriced")) {
    return "A pending transaction with the same nonce exists. Speed up/cancel it in MetaMask, then retry.";
  }
  if (raw.includes("insufficient funds")) {
    return "Insufficient ETH for gas fees. Fund your wallet and retry.";
  }
  if (raw.includes("execution reverted")) {
    return "Contract rejected this operation. Check your role, inputs, and selected network.";
  }
  if (raw.includes("network") && raw.includes("sepolia")) {
    return "Wrong network. Switch MetaMask to Sepolia and retry.";
  }

  return extractRawMessage(err);
}

function extractRawMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as {
      shortMessage?: string;
      reason?: string;
      message?: string;
      info?: { error?: { message?: string } };
      error?: { message?: string };
    };
    return (
      e.shortMessage ||
      e.reason ||
      e.info?.error?.message ||
      e.error?.message ||
      e.message ||
      JSON.stringify(err)
    );
  }
  return String(err);
}
