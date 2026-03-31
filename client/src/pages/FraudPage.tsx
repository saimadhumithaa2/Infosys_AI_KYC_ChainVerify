import { useState } from "react";
import { motion } from "framer-motion";
import { Contract } from "ethers";
import { KYC_PLATFORM_ABI } from "@/lib/abi";
import { apiUrl } from "@/lib/constants";
import { ensureSepoliaOrThrow } from "@/lib/chain";
import { notifyTxError, notifyTxSubmitted } from "@/lib/txToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
export function FraudPage() {
  const { provider, account, wrongNetwork } = useWallet();
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS;

  const [target, setTarget] = useState("");
  const [score, setScore] = useState(50);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [qLoading, setQLoading] = useState(false);
  const [fraud, setFraud] = useState<{
    fraudScore: number;
    reason: string;
    reporter: string;
    timestamp: bigint;
  } | null>(null);

  async function submitReport() {
    if (!provider || !contractAddr || !account) {
      notifyTxError(new Error("Connect wallet"));
      return;
    }
    if (wrongNetwork) {
      notifyTxError(new Error("Switch to Sepolia"));
      return;
    }
    const t = target.trim().toLowerCase();
    if (!t || !reason.trim()) {
      notifyTxError(new Error("Target and reason required"));
      return;
    }

    setLoading(true);
    try {
      await ensureSepoliaOrThrow(true);
      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.reportFraud(t, score, reason.trim());
      notifyTxSubmitted(tx.hash);
      await tx.wait();

      await fetch(apiUrl("/fraud"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetIdentifier: t,
          fraudScore: score,
          reason: reason.trim(),
          reporterAddress: account,
          txHash: tx.hash,
          chainId: 11155111,
        }),
      }).catch(() => {});
    } catch (e) {
      notifyTxError(e);
    } finally {
      setLoading(false);
    }
  }

  async function queryFraud() {
    const id = q.trim().toLowerCase();
    if (!id || !provider || !contractAddr) return;
    setQLoading(true);
    setFraud(null);
    try {
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, provider);
      const ex = await c.fraudExists(id);
      if (!ex) {
        setFraud(null);
        return;
      }
      const f = await c.getFraud(id);
      setFraud({
        fraudScore: Number(f.fraudScore),
        reason: f.reason,
        reporter: f.reporter,
        timestamp: f.timestamp,
      });
    } catch (e) {
      notifyTxError(e);
    } finally {
      setQLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Report fraud</CardTitle>
            <CardDescription>
              Signed by your wallet. Score 0–100 is stored for the target identifier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-white/50">Target identifier</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target@id" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Fraud score (0–100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Reason</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Details" />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={loading || wrongNetwork || !contractAddr}
              onClick={submitReport}
            >
              {loading ? "Confirm in wallet…" : "Submit on-chain report"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle>Fraud status</CardTitle>
            <CardDescription>Query aggregated fraud data from the contract.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Identifier" />
              <Button variant="outline" onClick={queryFraud} disabled={qLoading}>
                Query
              </Button>
            </div>
            {qLoading && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {fraud && (
              <div className="glass-panel space-y-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Risk score</span>
                  <span className="text-2xl font-bold text-amber-300">{fraud.fraudScore}</span>
                </div>
                <Progress value={fraud.fraudScore} />
                <div>
                  <div className="text-xs text-white/50">Reason</div>
                  <p className="text-sm">{fraud.reason}</p>
                </div>
                <div className="text-xs text-white/50">
                  Reporter:{" "}
                  <a
                    className="text-violet-300 underline"
                    href={`https://sepolia.etherscan.io/address/${fraud.reporter}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {fraud.reporter}
                  </a>
                </div>
                <div className="text-xs text-white/40">
                  {new Date(Number(fraud.timestamp) * 1000).toISOString()}
                </div>
              </div>
            )}
            {!qLoading && q && !fraud && (
              <p className="text-sm text-white/50">No fraud report for this identifier.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
