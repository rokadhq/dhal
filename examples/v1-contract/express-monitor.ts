import express from "express";
import { dhal } from "@rokadhq/dhal/express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(dhal({ configPath: "dhal.json" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", (_req, res) => {
  res.status(401).json({ ok: false });
});

app.listen(3000, () => {
  console.log("Dhal Express v1-contract example running on http://localhost:3000");
});
