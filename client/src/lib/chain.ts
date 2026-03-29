/** Switch MetaMask to Sepolia testnet */
export async function switchToSepolia() {
  const eth = window.ethereum;
  if (!eth) throw new Error("No wallet");

  const chainId = "0xaa36a7"; // 11155111
  const rpc = import.meta.env.VITE_SEPOLIA_RPC || "https://rpc.sepolia.org";

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [rpc],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
      return;
    }
    throw e;
  }
}
