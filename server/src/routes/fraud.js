import { Router } from "express";
import { FraudDocument } from "../models/FraudDocument.js";

export const fraudRouter = Router();

/** POST /fraud — cache fraud report after on-chain tx */
fraudRouter.post("/", async (req, res, next) => {
  try {
    const { targetIdentifier, fraudScore, reason, reporterAddress, txHash, chainId } = req.body;

    if (!targetIdentifier || fraudScore == null || !reason) {
      return res
        .status(400)
        .json({ error: "targetIdentifier, fraudScore, and reason are required" });
    }

    const score = Number(fraudScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: "fraudScore must be 0–100" });
    }

    const doc = await FraudDocument.findOneAndUpdate(
      { targetIdentifier: String(targetIdentifier).trim().toLowerCase() },
      {
        fraudScore: score,
        reason: String(reason),
        reporterAddress: reporterAddress || "",
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

/** GET /fraud/:id */
fraudRouter.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).trim().toLowerCase();
    const doc = await FraudDocument.findOne({ targetIdentifier: id });
    if (!doc) {
      return res.status(404).json({ error: "Fraud record not found in cache" });
    }
    res.json(doc);
  } catch (e) {
    next(e);
  }
});
