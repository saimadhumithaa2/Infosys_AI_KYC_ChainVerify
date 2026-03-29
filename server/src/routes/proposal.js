import { Router } from "express";
import { ProposalDocument } from "../models/ProposalDocument.js";

export const proposalRouter = Router();

/** POST /proposal — cache proposal metadata */
proposalRouter.post("/", async (req, res, next) => {
  try {
    const { proposalId, description, targetIssuer, isAddIssuer, proposerAddress, txHash, chainId } =
      req.body;

    if (proposalId == null || !description || !targetIssuer) {
      return res
        .status(400)
        .json({ error: "proposalId, description, and targetIssuer are required" });
    }

    const doc = await ProposalDocument.findOneAndUpdate(
      { proposalId: Number(proposalId) },
      {
        description,
        targetIssuer,
        isAddIssuer: Boolean(isAddIssuer),
        proposerAddress: proposerAddress || "",
        txHash: txHash || "",
        chainId: chainId ?? 11155111,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

/** GET /proposal — list recent proposals (cached) */
proposalRouter.get("/", async (_req, res, next) => {
  try {
    const list = await ProposalDocument.find().sort({ proposalId: -1 }).limit(50).lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});
