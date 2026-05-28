import express from "express";
import { dhal } from "../src/adapters/express.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(dhal());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "dhal example" });
});

app.post("/api/login", (_req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log("Dhal Express example running on http://localhost:3000");
});
