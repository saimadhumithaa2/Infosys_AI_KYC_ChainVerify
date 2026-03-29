import { motion } from "framer-motion";
import { ArrowRight, Shield, AlertTriangle, Vote, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { etherscanAddressUrl } from "@/lib/constants";

const cards = [
  {
    title: "KYC registry",
    desc: "Register identities with IPFS documents and on-chain SHA-256 proofs.",
    to: "/kyc",
    icon: Shield,
  },
  {
    title: "Fraud intelligence",
    desc: "Report and query tamper-evident fraud scores with MetaMask.",
    to: "/fraud",
    icon: AlertTriangle,
  },
  {
    title: "DAO governance",
    desc: "Issuer-only proposals and votes for network participants.",
    to: "/governance",
    icon: Vote,
  },
];

export function Dashboard() {
  const { account, isIssuer, isOwner, wrongNetwork } = useWallet();
  const addr = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-3xl p-8"
      >
        <h2 className="text-2xl font-bold tracking-tight">Operational overview</h2>
        <p className="mt-2 text-white/65">
          ChainVerify combines IPFS document storage, Ethereum attestations, and issuer-governed DAO
          controls. Every write is a real Sepolia transaction with Etherscan links.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {account ? (
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              Role:{" "}
              <strong className="text-white">
                {isOwner ? "Owner" : isIssuer ? "Issuer" : "User"}
              </strong>
            </span>
          ) : (
            <span className="text-amber-200/90">Connect MetaMask to transact.</span>
          )}
          {wrongNetwork && (
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-200">
              Wrong network — switch to Sepolia
            </span>
          )}
        </div>
        {addr && (
          <a
            href={etherscanAddressUrl(addr)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200"
          >
            <Link2 className="h-4 w-4" />
            Contract on Etherscan
          </a>
        )}
        {!addr && (
          <p className="mt-4 text-sm text-red-300/90">
            Set <code className="rounded bg-black/30 px-1">VITE_CONTRACT_ADDRESS</code> in{" "}
            <code className="rounded bg-black/30 px-1">client/.env</code> after deployment.
          </p>
        )}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="h-full transition-transform hover:-translate-y-0.5">
              <CardHeader>
                <c.icon className="mb-2 h-8 w-8 text-violet-400" />
                <CardTitle>{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={c.to}>
                  <Button variant="outline" className="w-full justify-between">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
