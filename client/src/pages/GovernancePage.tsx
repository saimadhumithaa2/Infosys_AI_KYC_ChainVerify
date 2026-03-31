import { useCallback, useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";

type ProposalRow = {
  id: number;
  description: string;
  targetIssuer: string;
  isAddIssuer: boolean;
  votesFor: bigint;
  votesAgainst: bigint;
  executed: boolean;
  exists: boolean;
};

export function GovernancePage() {
  const { provider, account, isIssuer, wrongNetwork } = useWallet();
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS;

  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [addIssuer, setAddIssuer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [list, setList] = useState<ProposalRow[]>([]);
  const [votes, setVotes] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!provider || !contractAddr || !account) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, provider);
      const cnt = await c.proposalCount();
      const n = Number(cnt);
      const rows: ProposalRow[] = [];
      const v: Record<number, boolean> = {};
      for (let i = 1; i <= n; i++) {
        const p = await c.proposals(i);
        rows.push({
          id: Number(p.id),
          description: p.description,
          targetIssuer: p.targetIssuer,
          isAddIssuer: p.isAddIssuer,
          votesFor: p.votesFor,
          votesAgainst: p.votesAgainst,
          executed: p.executed,
          exists: p.exists,
        });
        v[i] = await c.hasVoted(i, account);
      }
      setList(rows.filter((r) => r.exists));
      setVotes(v);
    } catch (e) {
      notifyTxError(e);
    } finally {
      setLoading(false);
    }
  }, [provider, contractAddr, account]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitProposal() {
    if (!provider || !contractAddr || !account) return;
    if (!isIssuer) {
      notifyTxError(new Error("Only issuers can submit proposals"));
      return;
    }
    if (wrongNetwork) {
      notifyTxError(new Error("Switch to Sepolia"));
      return;
    }
    if (!desc.trim() || !target.startsWith("0x")) {
      notifyTxError(new Error("Description and valid issuer address required"));
      return;
    }

    setSubmitting(true);
    try {
      await ensureSepoliaOrThrow(true);
      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.submitProposal(desc.trim(), target.trim(), addIssuer);
      notifyTxSubmitted(tx.hash);
      await tx.wait();
      const cRead = new Contract(contractAddr, KYC_PLATFORM_ABI, provider);
      const pid = Number(await cRead.proposalCount());
      await fetch(apiUrl("/proposal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: pid,
          description: desc.trim(),
          targetIssuer: target.trim(),
          isAddIssuer: addIssuer,
          proposerAddress: account,
          txHash: tx.hash,
          chainId: 11155111,
        }),
      }).catch(() => {});
      setDesc("");
      await load();
    } catch (e) {
      notifyTxError(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(id: number, approve: boolean) {
    if (!provider || !contractAddr) return;
    if (wrongNetwork) {
      notifyTxError(new Error("Switch to Sepolia"));
      return;
    }
    try {
      await ensureSepoliaOrThrow(true);
      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.voteProposal(id, approve);
      notifyTxSubmitted(tx.hash);
      await tx.wait();
      await load();
    } catch (e) {
      notifyTxError(e);
    }
  }

  async function execute(id: number) {
    if (!provider || !contractAddr) return;
    if (wrongNetwork) {
      notifyTxError(new Error("Switch to Sepolia"));
      return;
    }
    try {
      await ensureSepoliaOrThrow(true);
      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.executeProposal(id);
      notifyTxSubmitted(tx.hash);
      await tx.wait();
      await load();
    } catch (e) {
      notifyTxError(e);
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Submit proposal</CardTitle>
            <CardDescription>
              Issuers can propose adding or removing an issuer address. Votes are recorded on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Proposal description"
            />
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0x… target issuer"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addIssuer}
                onChange={(e) => setAddIssuer(e.target.checked)}
                className="rounded border-white/20 bg-black/30"
              />
              Add issuer (unchecked = remove)
            </label>
            <Button disabled={submitting || !isIssuer || wrongNetwork || !contractAddr} onClick={submitProposal}>
              {submitting ? "Submitting…" : "Submit proposal"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active proposals</h2>
          <Button variant="outline" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        </div>
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        <div className="space-y-4">
          {list.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-white/40">#{p.id}</div>
                  <p className="mt-1 font-medium">{p.description}</p>
                  <p className="mt-2 text-sm text-white/60">
                    Target:{" "}
                    <span className="font-mono text-xs text-violet-300">{p.targetIssuer}</span> ·{" "}
                    {p.isAddIssuer ? "Add issuer" : "Remove issuer"}
                  </p>
                  <p className="mt-2 text-sm">
                    Votes: <span className="text-emerald-300">{p.votesFor.toString()}</span> for ·{" "}
                    <span className="text-red-300">{p.votesAgainst.toString()}</span> against
                  </p>
                  {p.executed && (
                    <p className="mt-2 text-xs text-white/40">Executed (closed)</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!p.executed && isIssuer && !votes[p.id] && (
                    <>
                      <Button size="sm" onClick={() => vote(p.id, true)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => vote(p.id, false)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {!p.executed && isIssuer && (
                    <Button size="sm" variant="outline" onClick={() => execute(p.id)}>
                      Finalize
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {!loading && list.length === 0 && (
          <p className="text-sm text-white/50">No proposals yet.</p>
        )}
      </div>
    </div>
  );
}
