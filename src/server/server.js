const express = require("express");
const apiRouter = require(".");

const app = express();
app.use(express.json());

// Landing page — mostly cosmetic for the live demo
app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pizza Order API</title>
<style>
  :root {
    --navy: #1E2761;
    --coral: #F96167;
    --cream: #FBF6EE;
    --bg: #F8F9FA;
    --text: #1A1A1A;
    --muted: #5C6B7A;
    --border: #E2E8F0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Calibri, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(30, 39, 97, 0.08);
    max-width: 720px;
    width: 100%;
    overflow: hidden;
  }
  header {
    background: var(--navy);
    color: white;
    padding: 28px 32px;
    position: relative;
  }
  header::after {
    content: "";
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: var(--coral);
  }
  .kicker {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--coral);
    font-weight: 700;
    margin-bottom: 8px;
  }
  h1 {
    font-size: 32px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .status {
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--cream);
  }
  .dot {
    width: 8px; height: 8px;
    background: #16A34A;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2); }
    50% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.05); }
  }
  .body { padding: 28px 32px; }
  h2 {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 14px;
  }
  .endpoints {
    list-style: none;
    margin-bottom: 28px;
  }
  .endpoints li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-family: "SF Mono", Consolas, "Monaco", monospace;
    font-size: 13px;
  }
  .endpoints li:last-child { border-bottom: none; }
  .method {
    display: inline-block;
    min-width: 56px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.5px;
  }
  .method.get { background: #DBEAFE; color: #1E40AF; }
  .method.post { background: #DCFCE7; color: #166534; }
  .method.crud { background: #FEF3C7; color: #92400E; }
  .path { color: var(--navy); font-weight: 500; }
  .stack {
    background: var(--cream);
    border-left: 3px solid var(--coral);
    padding: 14px 18px;
    border-radius: 0 6px 6px 0;
    font-size: 13px;
    color: var(--muted);
  }
  .stack strong { color: var(--navy); }
  footer {
    padding: 16px 32px;
    background: #F1F5F9;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
    text-align: center;
  }
  footer code {
    font-family: "SF Mono", Consolas, monospace;
    background: white;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--border);
  }
</style>
</head>
<body>
  <main class="card">
    <header>
      <div class="kicker">Práctica 4 — Despliegue con Docker y CI/CD</div>
      <h1><span>🍕</span> Pizza Order API</h1>
      <div class="status">
        <span class="dot"></span>
        Servicio operativo — v1.0.0
      </div>
    </header>

    <div class="body">
      <h2>Endpoints disponibles</h2>
      <ul class="endpoints">
        <li><span class="method get">GET</span> <span class="path">/healthCheck</span></li>
        <li><span class="method post">POST</span> <span class="path">/api/people/signup</span></li>
        <li><span class="method post">POST</span> <span class="path">/api/people/login</span></li>
        <li><span class="method crud">CRUD</span> <span class="path">/api/pizzaPlaces</span></li>
        <li><span class="method crud">CRUD</span> <span class="path">/api/cooks</span></li>
        <li><span class="method crud">CRUD</span> <span class="path">/api/pizzas</span></li>
        <li><span class="method crud">CRUD</span> <span class="path">/api/orders</span></li>
      </ul>

      <h2>Stack</h2>
      <div class="stack">
        <strong>Node.js 22</strong> · Express 5 · MariaDB 11 · nginx · Docker · GitHub Actions<br>
        Imagen publicada en <strong>GHCR</strong> · Despliegue automático por SSH en VM Azure
      </div>
    </div>

    <footer>
      Desplegado vía CI/CD — última imagen: <code>ghcr.io/juliovicente0/...:latest</code>
    </footer>
  </main>
</body>
</html>`);
});

app.use("/api", apiRouter);
app.get("/healthCheck", (req, res) => res.send("OK"));

module.exports = app;
