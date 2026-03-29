import mongoose from "mongoose";

const fraudSchema = new mongoose.Schema(
  {
    targetIdentifier: { type: String, required: true, index: true },
    fraudScore: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true },
    reporterAddress: { type: String, default: "" },
    txHash: { type: String, default: "" },
    chainId: { type: Number, default: 11155111 },
    reportedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const FraudDocument = mongoose.model("FraudDocument", fraudSchema);
