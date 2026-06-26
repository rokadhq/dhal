import http from "node:http";
import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";

const dhal = createNodeHttpDhal({ configPath: "dhal.json" });

http.createServer(async (req, res) => {
  const decision = await dhal.inspect(req, res);
  if (decision.action === "block") return;

  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ ok: true }));
}).listen(3000, () => {
  console.log("Dhal node:http v1-contract example running on http://localhost:3000");
});
