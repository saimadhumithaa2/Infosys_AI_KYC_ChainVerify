# ChainVerify — Decentralized KYC & Fraud Platform

Production-oriented full-stack DApp: **Solidity (Hardhat)**, **React (Vite) + Tailwind + Framer Motion + Sonner**, **Express + MongoDB**, **IPFS (Pinata / Web3.Storage)**, **MetaMask on Sepolia**.

## Repository layout

| Path | Purpose |
|------|---------|
| `contracts/` | Hardhat, `KYCPlatform.sol`, unit tests, deploy script |
| `client/` | Vite React frontend (Ethers.js v6) |
| `server/` | Express REST API + IPFS upload proxy |
| `scripts/` | Root helper to run deploy from repo root |
| `utils/` | Shared helpers (optional metadata hashing) |
| `sample-data/` | Example JSON for KYC metadata |

## Prerequisites

- Node.js 18+
- MetaMask with a Sepolia-funded account ([Sepolia faucet](https://sepoliafaucet.com/) or similar)
- MongoDB running locally or Atlas URI
- Pinata JWT **or** Web3.Storage token for IPFS uploads

## Environment variables

1. Copy `.env.example` to `.env` at the repo root (used by Hardhat when deploying).
2. Copy `client/.env.example` to `client/.env` and set `VITE_CONTRACT_ADDRESS` after deployment.
3. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and IPFS credentials.

## Smart contract — deploy to Sepolia

```bash
cd contracts
npm install
# Set SEPOLIA_RPC_URL, PRIVATE_KEY, INITIAL_ISSUER (optional) in ../.env
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

From the repo root you can also run:

```bash
node scripts/deploy.js --network sepolia
```

After deployment, add the printed address to `client/.env` as `VITE_CONTRACT_ADDRESS`.

### Contract tests

```bash
cd contracts
npx hardhat test
```

## Backend API

```bash
cd server
npm install
# Configure server/.env (MONGODB_URI, PINATA_JWT or WEB3_STORAGE_TOKEN)
npm run dev
```

Default API: `http://localhost:5000`  
Health check: `GET /health`

REST routes (as specified):

- `POST /kyc`, `GET /kyc/:id`
- `POST /fraud`, `GET /fraud/:id`
- `POST /proposal`, `GET /proposal` (list cached proposals)

IPFS: `POST /upload` (multipart field `file`) — requires `PINATA_JWT` or `WEB3_STORAGE_TOKEN`.

The Vite dev server proxies `/api/*` to the backend (see `client/vite.config.ts`).

## Frontend

```bash
cd client
npm install
# client/.env: VITE_CONTRACT_ADDRESS, optional VITE_SEPOLIA_RPC
npm run dev
```

Open `http://localhost:5173`, connect MetaMask, and **switch to Sepolia** (use in-app “Switch to Sepolia” if needed).

### Client tests

```bash
cd client
npm run test
```

## MetaMask — Sepolia

1. Install [MetaMask](https://metamask.io/).
2. Add Sepolia network (chain id `11155111`) or use the in-app switcher.
3. Import or create an account and fund it with Sepolia ETH.
4. The deployer and `INITIAL_ISSUER` (if set) are issuers on the contract; the owner can add more issuers via **Admin** in the UI (`setIssuer`).

## Sample data

See `sample-data/sample-metadata.json` for the shape hashed before `registerKYC`. The frontend builds a similar object after IPFS upload and hashes it with SHA-256 (`ethers.sha256`).

## Architecture notes

- **KYC**: document → `POST /upload` → CID → canonical JSON metadata → SHA-256 `bytes32` → `registerKYC` (issuer only) → `POST /kyc` cache.
- **Fraud**: `reportFraud` (any wallet) → optional `POST /fraud` cache.
- **DAO**: `submitProposal` / `voteProposal` / `executeProposal` (issuers); issuer list updates when `executeProposal` passes with `votesFor > votesAgainst`.
- **Etherscan**: toasts link to `https://sepolia.etherscan.io/tx/...` after transactions.

## Security

Never commit `.env` or private keys. Use a dedicated deployer account on testnets only.
