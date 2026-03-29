import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { kycRouter } from "./routes/kyc.js";
import { fraudRouter } from "./routes/fraud.js";
import { proposalRouter } from "./routes/proposal.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kyc-platform-api" });
});

app.use("/kyc", kycRouter);
app.use("/fraud", fraudRouter);
app.use("/proposal", proposalRouter);
app.use("/upload", uploadRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kyc_platform";

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`API listening on ${PORT}`));
  })
  .catch((e) => {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  });
