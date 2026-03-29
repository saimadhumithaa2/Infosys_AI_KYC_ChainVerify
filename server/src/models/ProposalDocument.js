import mongoose from "mongoose";

const proposalSchema = new mongoose.Schema(
  {
    proposalId: { type: Number, required: true, index: true },
    description: { type: String, required: true },
    targetIssuer: { type: String, required: true },
    isAddIssuer: { type: Boolean, required: true },
    proposerAddress: { type: String, default: "" },
    txHash: { type: String, default: "" },
    chainId: { type: Number, default: 11155111 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ProposalDocument = mongoose.model("ProposalDocument", proposalSchema);
