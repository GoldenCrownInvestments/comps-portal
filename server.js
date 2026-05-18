import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findComps } from "./src/providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function writeCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("access-control-allow-methods", "GET,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
}

async function sendJson(res, status, payload) {
  writeCorsHeaders(res);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    writeCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/health") {
    await sendJson(res, 200, { ok: true, service: "comps-portal" });
    return;
  }

  if (url.pathname === "/api/comps" || url.pathname === "/comps") {
    const address = url.searchParams.get("address")?.trim();
    if (!address) {
      await sendJson(res, 400, { error: "Enter an address to search comps." });
      return;
    }

    try {
      const result = await findComps(address);
      await sendJson(res, 200, result);
    } catch (error) {
      await sendJson(res, 500, { error: error.message || "Unable to search comps." });
    }
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Comps portal running on port ${port}`);
});
