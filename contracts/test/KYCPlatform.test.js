const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KYCPlatform", function () {
  let kyc, owner, issuer, user, other;

  const id = "user@example.com";
  const hash = ethers.keccak256(ethers.toUtf8Bytes("metadata"));

  beforeEach(async function () {
    [owner, issuer, user, other] = await ethers.getSigners();
    const KYCPlatform = await ethers.getContractFactory("KYCPlatform");
    kyc = await KYCPlatform.deploy(issuer.address);
    await kyc.waitForDeployment();
  });

  it("sets deployer and initial issuer", async function () {
    expect(await kyc.owner()).to.equal(owner.address);
    expect(await kyc.issuers(owner.address)).to.equal(true);
    expect(await kyc.issuers(issuer.address)).to.equal(true);
  });

  it("registerKYC and getKYC", async function () {
    await kyc.connect(issuer).registerKYC(id, hash, true);
    const r = await kyc.getKYC(id);
    expect(r.metadataHash).to.equal(hash);
    expect(r.verified).to.equal(true);
    expect(r.issuer).to.equal(issuer.address);
  });

  it("rejects registerKYC from non-issuer", async function () {
    await expect(kyc.connect(user).registerKYC(id, hash, false)).to.be.revertedWith(
      "KYCPlatform: not issuer"
    );
  });

  it("reportFraud and getFraud", async function () {
    await kyc.connect(user).reportFraud(id, 75, "suspicious activity");
    const f = await kyc.getFraud(id);
    expect(f.fraudScore).to.equal(75);
    expect(f.reporter).to.equal(user.address);
  });

  it("proposal flow: submit, vote, execute", async function () {
    await kyc.connect(issuer).submitProposal("Add new issuer", other.address, true);
    const pid = 1n;
    await kyc.connect(issuer).voteProposal(pid, true);
    await kyc.connect(owner).executeProposal(pid);
    expect(await kyc.issuers(other.address)).to.equal(true);
  });

  it("non-issuer cannot vote", async function () {
    await kyc.connect(issuer).submitProposal("test", other.address, true);
    await expect(kyc.connect(user).voteProposal(1, true)).to.be.revertedWith(
      "KYCPlatform: not issuer"
    );
  });
});
