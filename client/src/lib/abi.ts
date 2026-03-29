/** KYCPlatform contract — human-readable ABI for ethers v6 */
export const KYC_PLATFORM_ABI = [
  "function owner() view returns (address)",
  "function issuers(address) view returns (bool)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256 proposalId) view returns (uint256 id, string description, address targetIssuer, bool isAddIssuer, uint256 votesFor, uint256 votesAgainst, bool executed, bool exists)",
  "function registerKYC(string identifier, bytes32 metadataHash, bool verified)",
  "function getKYC(string identifier) view returns (tuple(string identifier, bytes32 metadataHash, bool verified, address issuer, uint256 timestamp, bool exists))",
  "function kycExists(string identifier) view returns (bool)",
  "function reportFraud(string targetIdentifier, uint8 fraudScore, string reason)",
  "function getFraud(string targetIdentifier) view returns (tuple(string targetIdentifier, uint8 fraudScore, string reason, address reporter, uint256 timestamp, bool exists))",
  "function fraudExists(string targetIdentifier) view returns (bool)",
  "function submitProposal(string description, address targetIssuer, bool isAddIssuer)",
  "function voteProposal(uint256 proposalId, bool approve)",
  "function executeProposal(uint256 proposalId)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function setIssuer(address account, bool active)",
] as const;
