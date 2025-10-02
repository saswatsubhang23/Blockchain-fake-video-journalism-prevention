import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from 'url';
import { loadConfig } from "./config/env.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cfg = loadConfig();

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve static files
app.use(express.static('.'));

// Default route - serve visual interface
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../visual-interface.html'));
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/", routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || "Internal Server Error" });
});

app.listen(cfg.server.port, () => {
  console.log(`🚀 Server listening on http://localhost:${cfg.server.port}`);
});