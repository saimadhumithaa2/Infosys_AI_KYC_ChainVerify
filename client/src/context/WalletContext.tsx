import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, Contract, formatEther, type Eip1193Provider } from "ethers";
import { KYC_PLATFORM_ABI } from "@/lib/abi";
import { SEPOLIA_CHAIN_ID } from "@/lib/constants";

type WalletCtx = {
  account: string | null;
  chainId: bigint | null;
  balance: string | null;
  provider: BrowserProvider | null;
  contract: Contract | null;
  isIssuer: boolean;
  isOwner: boolean;
  wrongNetwork: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<WalletCtx | null>(null);

function getContractAddress() {
  const a = import.meta.env.VITE_CONTRACT_ADDRESS;
  if (!a || a === "0x0000000000000000000000000000000000000000") {
    return null;
  }
  return a;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetWalletState = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setBalance(null);
    setContract(null);
    setIsIssuer(false);
    setIsOwner(false);
  }, []);

  const refreshRoles = useCallback(async () => {
    const addr = getContractAddress();
    if (!addr || !window.ethereum || !account) {
      setIsIssuer(false);
      setIsOwner(false);
      return;
    }
    const p = new BrowserProvider(window.ethereum as Eip1193Provider);
    const c = new Contract(addr, KYC_PLATFORM_ABI, p);
    try {
      const [issuer, ownerAddr] = await Promise.all([c.issuers(account), c.owner()]);
      setIsIssuer(Boolean(issuer));
      setIsOwner(ownerAddr.toLowerCase() === account.toLowerCase());
    } catch {
      setIsIssuer(false);
      setIsOwner(false);
    }
  }, [account]);

  const syncWallet = useCallback(
    async (requestAccounts: boolean) => {
      const eth = window.ethereum;
      if (!eth) {
        setError("Install MetaMask to use this DApp.");
        resetWalletState();
        return;
      }

      const p = new BrowserProvider(eth as Eip1193Provider);
      const method = requestAccounts ? "eth_requestAccounts" : "eth_accounts";
      const accs = (await eth.request({ method })) as string[];
      const addr = accs[0] ?? null;

      if (!addr) {
        setError(requestAccounts ? "MetaMask connection was not approved." : null);
        resetWalletState();
        return;
      }

      setAccount(addr);
      setProvider(p);

      const net = await p.getNetwork();
      setChainId(net.chainId);

      const bal = await p.getBalance(addr);
      setBalance(formatEther(bal));

      const cAddr = getContractAddress();
      setContract(cAddr ? new Contract(cAddr, KYC_PLATFORM_ABI, p) : null);
      setError(null);
    },
    [resetWalletState]
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await syncWallet(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
      resetWalletState();
    } finally {
      setConnecting(false);
    }
  }, [resetWalletState, syncWallet]);

  useEffect(() => {
    syncWallet(false).catch(() => {});
  }, [syncWallet]);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const onAccounts = () => {
      syncWallet(false).catch(() => {
        resetWalletState();
      });
    };
    const onChain = () => {
      syncWallet(false).catch(() => {});
    };
    const onDisconnect = () => {
      resetWalletState();
    };

    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    eth.on?.("disconnect", onDisconnect);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
      eth.removeListener?.("disconnect", onDisconnect);
    };
  }, [resetWalletState, syncWallet]);

  useEffect(() => {
    if (account && provider) {
      provider.getBalance(account).then((b) => setBalance(formatEther(b))).catch(() => {});
    }
  }, [account, provider]);

  useEffect(() => {
    if (account) {
      refreshRoles();
      return;
    }
    setIsIssuer(false);
    setIsOwner(false);
  }, [account, refreshRoles]);

  const wrongNetwork = chainId !== null && chainId !== SEPOLIA_CHAIN_ID;

  const value = useMemo(
    () => ({
      account,
      chainId,
      balance,
      provider,
      contract,
      isIssuer,
      isOwner,
      wrongNetwork,
      connecting,
      error,
      connect,
      refreshRoles,
    }),
    [
      account,
      chainId,
      balance,
      provider,
      contract,
      isIssuer,
      isOwner,
      wrongNetwork,
      connecting,
      error,
      connect,
      refreshRoles,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
