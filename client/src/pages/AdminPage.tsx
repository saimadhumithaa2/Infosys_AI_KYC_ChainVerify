import { useState } from "react";
import { motion } from "framer-motion";
import { Contract } from "ethers";
import { KYC_PLATFORM_ABI } from "@/lib/abi";
import { ensureSepoliaOrThrow } from "@/lib/chain";
import { notifyTxError, notifyTxSubmitted } from "@/lib/txToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/context/WalletContext";

export function AdminPage() {
  const { provider, isOwner, wrongNetwork, refreshRoles } = useWallet();
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS;

  const [addr, setAddr] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  async function setIssuer() {
    if (!provider || !contractAddr) return;
    if (wrongNetwork) {
      notifyTxError(new Error("Switch to Sepolia"));
      return;
    }
    if (!isOwner) {
      notifyTxError(new Error("Only contract owner can set issuers"));
      return;
    }
    if (!addr.startsWith("0x") || addr.length < 42) {
      notifyTxError(new Error("Valid address required"));
      return;
    }
    setLoading(true);
    try {
      await ensureSepoliaOrThrow(true);
      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.setIssuer(addr.trim(), active);
      notifyTxSubmitted(tx.hash);
      await tx.wait();
      await refreshRoles();
    } catch (e) {
      notifyTxError(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel max-w-xl p-8">
        <p className="text-white/70">Owner wallet required for admin actions.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Issuer administration</CardTitle>
          <CardDescription>
            Owner-only: grant or revoke issuer role used for KYC registration and DAO votes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x issuer address" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-white/20 bg-black/30"
            />
            Active (unchecked = revoke)
          </label>
          <Button disabled={loading || wrongNetwork || !contractAddr} onClick={setIssuer}>
            {loading ? "Sending…" : "Update issuer"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
