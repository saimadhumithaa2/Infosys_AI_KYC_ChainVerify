import { Router } from "express";
import { KycDocument } from "../models/KycDocument.js";

export const kycRouter = Router();

/** POST /kyc — cache KYC metadata after on-chain registration */
kycRouter.post("/", async (req, res, next) => {
  try {
    const {
      identifier,
      ipfsCid,
      metadataHash,
      verified,
      issuerAddress,
      txHash,
      chainId,
    } = req.body;

    if (!identifier || !ipfsCid || !metadataHash) {
      return res.status(400).json({ error: "identifier, ipfsCid, and metadataHash are required" });
    }

    const doc = await KycDocument.findOneAndUpdate(
      { identifier: String(identifier).trim().toLowerCase() },
      {
        ipfsCid,
        metadataHash,
        verified: Boolean(verified),
        issuerAddress: issuerAddress || "",
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

/** GET /kyc/:id — cached KYC metadata */
kycRouter.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).trim().toLowerCase();
    const doc = await KycDocument.findOne({ identifier: id });
    if (!doc) {
      return res.status(404).json({ error: "KYC not found in cache" });
    }
    res.json(doc);
  } catch (e) {
    next(e);
  }
});
