import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { processBfhl } from "./bfhl.js";

dotenv.config();

export const identity = {
  user_id: process.env.USER_ID || "",
  email_id: process.env.EMAIL_ID || "",
  college_roll_number: process.env.COLLEGE_ROLL_NUMBER || ""
};

export const validateIdentity = () => {
  if (!identity.user_id || !identity.email_id || !identity.college_roll_number) {
    throw new Error("Missing USER_ID, EMAIL_ID, or COLLEGE_ROLL_NUMBER environment variable");
  }
};

export const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/bfhl", (req, res) => {
  const { data } = req.body || {};
  if (!Array.isArray(data) || data.some((item) => typeof item !== "string")) {
    return res.status(400).json({
      error: "Request body must include data as an array of strings"
    });
  }
  const processed = processBfhl(data);
  return res.status(200).json({
    ...identity,
    ...processed
  });
});

app.use((err, _req, res, _next) => {
  return res.status(500).json({ error: err.message || "Internal server error" });
});
