const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const config = require("./config");
const { sendJson } = require("./http");
const { handleApiRequest } = require("./routes");

function sendHtml(res, filePath) {
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) {
      sendJson(res, 404, { error: "Dashboard not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    res.end(html);
  });
}

function startApiServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (!["GET", "POST", "DELETE"].includes(req.method)) {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/dashboard")) {
        sendHtml(res, path.join(__dirname, "..", "web-dashboard", "index.html"));
        return;
      }

      await handleApiRequest(req, res, requestUrl);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });

  const listen = (port, attemptsLeft = 5) => {
    server.once("error", (err) => {
      if ((err.code === "EACCES" || err.code === "EADDRINUSE") && attemptsLeft > 0) {
        console.warn(`API port ${port} unavailable (${err.code}), trying ${port + 1}...`);
        listen(port + 1, attemptsLeft - 1);
        return;
      }

      throw err;
    });

    server.listen(port, config.api.host, () => {
      console.log(`API listening on http://${config.api.host}:${port}`);
    });
  };

  listen(config.api.port);

  return server;
}

module.exports = {
  startApiServer,
};
