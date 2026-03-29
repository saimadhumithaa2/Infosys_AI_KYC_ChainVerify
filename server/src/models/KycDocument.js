import mongoose from "mongoose";

const kycSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true, index: true },
    ipfsCid: { type: String, required: true },
    metadataHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    issuerAddress: { type: String, default: "" },
    txHash: { type: String, default: "" },
    chainId: { type: Number, default: 11155111 },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const KycDocument = mongoose.model("KycDocument", kycSchema);
