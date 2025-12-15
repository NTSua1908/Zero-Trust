const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Serve the HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "web-ui" });
});

// Start server
app.listen(PORT, () => {
  console.log(`[OK] Web UI running at http://localhost:${PORT}`);
  console.log("[INFO] Open your browser and navigate to the URL above");
  console.log(
    "[INFO] Make sure backend services are running (AAA, Gateway, App)"
  );
});
