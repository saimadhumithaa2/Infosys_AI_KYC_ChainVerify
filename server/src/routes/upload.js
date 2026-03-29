import { Router } from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

export const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /upload — multipart file → Pinata IPFS (JWT) or Web3.Storage token
 * Returns { cid, ipfsUrl }
 */
uploadRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file field required" });
    }

    const pinataJwt = process.env.PINATA_JWT;
    const w3Token = process.env.WEB3_STORAGE_TOKEN;

    if (pinataJwt) {
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname || "document.bin",
        contentType: req.file.mimetype || "application/octet-stream",
      });

      const pinRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinataJwt}` },
        body: form,
      });

      const text = await pinRes.text();
      if (!pinRes.ok) {
        console.error("Pinata error:", text);
        return res.status(502).json({ error: "Pinata upload failed", detail: text });
      }

      const json = JSON.parse(text);
      const cid = json.IpfsHash;
      return res.json({
        cid,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      });
    }

    if (w3Token) {
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname || "document.bin",
        contentType: req.file.mimetype || "application/octet-stream",
      });

      const up = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${w3Token}` },
        body: form,
      });

      const text = await up.text();
      if (!up.ok) {
        return res.status(502).json({ error: "Web3.Storage upload failed", detail: text });
      }

      let cid;
      try {
        const j = JSON.parse(text);
        cid = j.cid || j.Cid;
      } catch {
        cid = text.trim();
      }

      return res.json({
        cid,
        ipfsUrl: `https://${cid}.ipfs.w3s.link`,
      });
    }

    return res.status(503).json({
      error: "IPFS not configured",
      hint: "Set PINATA_JWT or WEB3_STORAGE_TOKEN in server .env",
    });
  } catch (e) {
    next(e);
  }
});
