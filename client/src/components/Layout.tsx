import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, LayoutDashboard, Shield, AlertTriangle, Vote, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { switchToSepolia } from "@/lib/chain";
import { SEPOLIA_CHAIN_ID } from "@/lib/constants";
import { useBlockNumber } from "@/hooks/useBlockNumber";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/kyc", label: "KYC", icon: Shield },
  { to: "/fraud", label: "Fraud", icon: AlertTriangle },
  { to: "/governance", label: "Governance", icon: Vote },
  { to: "/admin", label: "Admin", icon: Settings, issuerOnly: false, ownerOnly: true },
];

export function Layout() {
  const loc = useLocation();
  const { account, balance, connect, connecting, wrongNetwork, chainId, isOwner } = useWallet();
  const block = useBlockNumber();
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const warnedWrongNetworkRef = useRef(false);

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try {
      await switchToSepolia();
      toast.success("Switched to Sepolia");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not switch network";
      toast.error("Network switch failed", { description: message });
    } finally {
      setSwitchingNetwork(false);
    }
  };

  useEffect(() => {
    if (!account || !wrongNetwork) {
      warnedWrongNetworkRef.current = false;
      return;
    }
    if (warnedWrongNetworkRef.current) return;

    warnedWrongNetworkRef.current = true;
    toast.warning("Wrong network detected", {
      description: "Please switch MetaMask to Sepolia to continue.",
      action: {
        label: "Switch now",
        onClick: () => {
          handleSwitchNetwork().catch(() => {});
        },
      },
      duration: 10000,
    });
  }, [account, wrongNetwork]);

  return (
    <div className="mesh-bg min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-12 pt-6 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ChainVerify</h1>
              <p className="text-sm text-white/50">Decentralized KYC & fraud intelligence</p>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3">
            {block != null && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                Live · block {block}
              </span>
            )}
            {account && chainId !== null && (
              <span className="text-xs text-white/40">
                Chain {chainId.toString()}
                {chainId === SEPOLIA_CHAIN_ID ? " (Sepolia)" : ""}
              </span>
            )}
            {wrongNetwork && (
              <Button
                size="sm"
                variant="outline"
                disabled={switchingNetwork}
                onClick={() => handleSwitchNetwork().catch(() => {})}
              >
                {switchingNetwork ? "Switching…" : "Switch to Sepolia"}
              </Button>
            )}
            {account ? (
              <div className="glass-panel flex items-center gap-3 px-4 py-2">
                <Wallet className="h-4 w-4 text-violet-300" />
                <div className="text-right text-sm">
                  <div className="font-mono text-xs text-white/80">
                    {account.slice(0, 6)}…{account.slice(-4)}
                  </div>
                  {balance != null && (
                    <div className="text-xs text-white/50">{Number(balance).toFixed(4)} ETH</div>
                  )}
                </div>
              </div>
            ) : (
              <Button onClick={() => connect()} disabled={connecting}>
                {connecting ? "Connecting…" : "Connect MetaMask"}
              </Button>
            )}
          </div>
        </header>

        <nav className="mb-8 flex flex-wrap gap-2">
          {nav
            .filter((n) => {
              if (n.ownerOnly && !isOwner) return false;
              return true;
            })
            .map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button
                  variant={loc.pathname === to ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-xl",
                    loc.pathname === to && "shadow-violet-500/20"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
        </nav>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
