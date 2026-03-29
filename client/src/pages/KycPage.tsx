import { useState } from "react";
import { motion } from "framer-motion";
import { Contract } from "ethers";
import { KYC_PLATFORM_ABI } from "@/lib/abi";
import { apiUrl } from "@/lib/constants";
import { hashMetadata } from "@/lib/hash";
import { notifyTxError, notifyTxSubmitted } from "@/lib/txToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
import { etherscanTxUrl } from "@/lib/constants";

export function KycPage() {
  const { provider, account, isIssuer, wrongNetwork } = useWallet();
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS;

  const [identifier, setIdentifier] = useState("");
  const [verified, setVerified] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [chainResult, setChainResult] = useState<{
    identifier: string;
    metadataHash: string;
    verified: boolean;
    issuer: string;
    timestamp: bigint;
  } | null>(null);
  const [cacheResult, setCacheResult] = useState<Record<string, unknown> | null>(null);

  async function uploadToIpfs() {
    if (!file) throw new Error("Choose a document file");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(apiUrl("/upload"), { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "IPFS upload failed — configure PINATA_JWT on server");
    return j.cid as string;
  }

  async function registerOnChain() {
    if (!provider || !contractAddr || !account) {
      throw new Error("Connect wallet and set contract address");
    }
    if (!isIssuer) throw new Error("Only issuers can register KYC on-chain");
    if (wrongNetwork) throw new Error("Switch to Sepolia");

    const id = identifier.trim().toLowerCase();
    if (!id) throw new Error("Enter an identifier (email or username)");

    setLoading(true);
    try {
      const ipfsCid = await uploadToIpfs();
      const meta = hashMetadata({
        identifier: id,
        ipfsCid,
        verified,
        registeredAt: new Date().toISOString(),
      });

      const signer = await provider.getSigner();
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, signer);
      const tx = await c.registerKYC(id, meta.bytes32, verified);
      notifyTxSubmitted(tx.hash);
      await tx.wait();

      await fetch(apiUrl("/kyc"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: id,
          ipfsCid,
          metadataHash: meta.sha256Hex,
          verified,
          issuerAddress: account,
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

  async function lookup() {
    const id = lookupId.trim().toLowerCase();
    if (!id || !provider || !contractAddr) return;
    setLookupLoading(true);
    setChainResult(null);
    setCacheResult(null);
    try {
      const c = new Contract(contractAddr, KYC_PLATFORM_ABI, provider);
      const exists = await c.kycExists(id);
      if (!exists) {
        setChainResult(null);
      } else {
        const r = await c.getKYC(id);
        setChainResult({
          identifier: r.identifier,
          metadataHash: r.metadataHash,
          verified: r.verified,
          issuer: r.issuer,
          timestamp: r.timestamp,
        });
      }
      const res = await fetch(apiUrl(`/kyc/${encodeURIComponent(id)}`));
      if (res.ok) setCacheResult(await res.json());
    } catch (e) {
      notifyTxError(e);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Register identity</CardTitle>
            <CardDescription>
              Document is uploaded to IPFS (Pinata / Web3.Storage). A SHA-256 hash of canonical
              metadata is stored on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-white/50">Identifier (email / username)</label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Verification status</label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="rounded border-white/20 bg-black/30"
                />
                Mark as verified
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Document</label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button
              className="w-full"
              disabled={loading || !isIssuer || wrongNetwork || !contractAddr}
              onClick={() => registerOnChain()}
            >
              {loading ? "Processing…" : "Upload & register on-chain"}
            </Button>
            {!isIssuer && account && (
              <p className="text-xs text-amber-200/90">Connected wallet is not an issuer.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Identity lookup</CardTitle>
            <CardDescription>Read KYC from the contract and optional MongoDB cache.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Search identifier"
              />
              <Button variant="outline" onClick={lookup} disabled={lookupLoading}>
                Search
              </Button>
            </div>
            {lookupLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {chainResult && (
              <div className="glass-panel space-y-2 rounded-xl p-4 text-sm">
                <div className="font-semibold text-emerald-300">On-chain record</div>
                <div>
                  <span className="text-white/50">Hash </span>
                  <span className="break-all font-mono text-xs">{chainResult.metadataHash}</span>
                </div>
                <div>
                  <span className="text-white/50">Verified </span>
                  {chainResult.verified ? "yes" : "no"}
                </div>
                <div>
                  <span className="text-white/50">Issuer </span>
                  <a
                    className="text-violet-300 underline"
                    href={`https://sepolia.etherscan.io/address/${chainResult.issuer}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {chainResult.issuer}
                  </a>
                </div>
                <div>
                  <span className="text-white/50">Time </span>
                  {new Date(Number(chainResult.timestamp) * 1000).toISOString()}
                </div>
              </div>
            )}
            {!lookupLoading && lookupId && !chainResult && (
              <p className="text-sm text-white/50">No on-chain KYC for this identifier.</p>
            )}
            {cacheResult && (
              <div className="glass-panel space-y-2 rounded-xl p-4 text-sm">
                <div className="font-semibold text-violet-300">Backend cache</div>
                <div>
                  <span className="text-white/50">IPFS CID </span>
                  <span className="break-all font-mono text-xs">{String(cacheResult.ipfsCid)}</span>
                </div>
                {cacheResult.txHash ? (
                  <a
                    href={etherscanTxUrl(String(cacheResult.txHash))}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-300 underline"
                  >
                    Last tx on Etherscan
                  </a>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
