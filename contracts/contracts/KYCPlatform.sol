// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title KYCPlatform
 * @notice Decentralized KYC registry, fraud reporting, and issuer-governed DAO proposals.
 */
contract KYCPlatform {
    // --- Structs ---

    struct KYCRecord {
        string identifier;
        bytes32 metadataHash;
        bool verified;
        address issuer;
        uint256 timestamp;
        bool exists;
    }

    struct FraudReport {
        string targetIdentifier;
        uint8 fraudScore;
        string reason;
        address reporter;
        uint256 timestamp;
        bool exists;
    }

    struct Proposal {
        uint256 id;
        string description;
        address targetIssuer;
        bool isAddIssuer;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool exists;
    }

    // --- State ---

    address public owner;

    mapping(address => bool) public issuers;
    mapping(string => KYCRecord) private _kycByIdentifier;
    mapping(string => FraudReport) private _fraudByIdentifier;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    uint256 public proposalCount;

    // --- Events ---

    event IssuerUpdated(address indexed issuer, bool active, address indexed by);
    event KYCRegistered(
        string identifier,
        bytes32 metadataHash,
        bool verified,
        address indexed issuer,
        uint256 timestamp
    );
    event FraudReported(
        string targetIdentifier,
        uint8 fraudScore,
        string reason,
        address indexed reporter,
        uint256 timestamp
    );
    event ProposalSubmitted(
        uint256 indexed proposalId,
        string description,
        address targetIssuer,
        bool isAddIssuer,
        address indexed proposer
    );
    event ProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool approve,
        uint256 votesFor,
        uint256 votesAgainst
    );
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "KYCPlatform: not owner");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "KYCPlatform: not issuer");
        _;
    }

    constructor(address initialIssuer) {
        owner = msg.sender;
        if (initialIssuer != address(0)) {
            issuers[initialIssuer] = true;
            emit IssuerUpdated(initialIssuer, true, msg.sender);
        }
        issuers[msg.sender] = true;
        emit IssuerUpdated(msg.sender, true, msg.sender);
    }

    // --- Admin ---

    function setIssuer(address account, bool active) external onlyOwner {
        issuers[account] = active;
        emit IssuerUpdated(account, active, msg.sender);
    }

    // --- KYC ---

    function registerKYC(
        string calldata identifier,
        bytes32 metadataHash,
        bool verified
    ) external onlyIssuer {
        require(bytes(identifier).length > 0, "KYCPlatform: empty identifier");
        require(metadataHash != bytes32(0), "KYCPlatform: invalid hash");

        _kycByIdentifier[identifier] = KYCRecord({
            identifier: identifier,
            metadataHash: metadataHash,
            verified: verified,
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit KYCRegistered(identifier, metadataHash, verified, msg.sender, block.timestamp);
    }

    function getKYC(string calldata identifier) external view returns (KYCRecord memory) {
        KYCRecord memory r = _kycByIdentifier[identifier];
        require(r.exists, "KYCPlatform: KYC not found");
        return r;
    }

    function kycExists(string calldata identifier) external view returns (bool) {
        return _kycByIdentifier[identifier].exists;
    }

    // --- Fraud ---

    function reportFraud(
        string calldata targetIdentifier,
        uint8 fraudScore,
        string calldata reason
    ) external {
        require(bytes(targetIdentifier).length > 0, "KYCPlatform: empty target");
        require(fraudScore <= 100, "KYCPlatform: score > 100");
        require(bytes(reason).length > 0, "KYCPlatform: empty reason");

        _fraudByIdentifier[targetIdentifier] = FraudReport({
            targetIdentifier: targetIdentifier,
            fraudScore: fraudScore,
            reason: reason,
            reporter: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit FraudReported(targetIdentifier, fraudScore, reason, msg.sender, block.timestamp);
    }

    function getFraud(string calldata targetIdentifier) external view returns (FraudReport memory) {
        FraudReport memory f = _fraudByIdentifier[targetIdentifier];
        require(f.exists, "KYCPlatform: fraud report not found");
        return f;
    }

    function fraudExists(string calldata targetIdentifier) external view returns (bool) {
        return _fraudByIdentifier[targetIdentifier].exists;
    }

    // --- DAO ---

    function submitProposal(
        string calldata description,
        address targetIssuer,
        bool isAddIssuer
    ) external onlyIssuer {
        require(bytes(description).length > 0, "KYCPlatform: empty description");
        require(targetIssuer != address(0), "KYCPlatform: invalid issuer address");

        uint256 id = ++proposalCount;
        proposals[id] = Proposal({
            id: id,
            description: description,
            targetIssuer: targetIssuer,
            isAddIssuer: isAddIssuer,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            exists: true
        });

        emit ProposalSubmitted(id, description, targetIssuer, isAddIssuer, msg.sender);
    }

    function voteProposal(uint256 proposalId, bool approve) external onlyIssuer {
        Proposal storage p = proposals[proposalId];
        require(p.exists, "KYCPlatform: proposal not found");
        require(!p.executed, "KYCPlatform: proposal closed");
        require(!_hasVoted[proposalId][msg.sender], "KYCPlatform: already voted");

        _hasVoted[proposalId][msg.sender] = true;

        if (approve) {
            p.votesFor += 1;
        } else {
            p.votesAgainst += 1;
        }

        emit ProposalVoted(proposalId, msg.sender, approve, p.votesFor, p.votesAgainst);
    }

    function executeProposal(uint256 proposalId) external onlyIssuer {
        Proposal storage p = proposals[proposalId];
        require(p.exists, "KYCPlatform: proposal not found");
        require(!p.executed, "KYCPlatform: already executed");

        bool passed = p.votesFor > p.votesAgainst;
        p.executed = true;

        if (passed) {
            issuers[p.targetIssuer] = p.isAddIssuer;
            emit IssuerUpdated(p.targetIssuer, p.isAddIssuer, address(this));
        }

        emit ProposalExecuted(proposalId, passed);
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }
}
