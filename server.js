const WebSocketJSONStream = require("@teamwork/websocket-json-stream");
const ShareDB = require("sharedb");
const express = require("express");
const http = require("http");
const { Server } = require("ws");
const jwt = require("jsonwebtoken");

const backend = new ShareDB();

const JWT_SECRET = "shh";

function startServer() {
  const app = express();

  const server = http.createServer(app);

  const wss = new Server({
    server,
    verifyClient: (info, cb) => {
      // checks if JWT is included in cookies, does not allow connection if invalid
      const [, token] = info.req.headers.cookie.match(/Authorization\=([^;]+)/);

      if (!token) {
        cb(false, 401, "Unauthorized");
      } else {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (err) {
            cb(false, 401, "Unauthorized");
          } else {
            console.log({ newConnection: decoded });
            info.req.user = decoded;
            cb(true);
          }
        });
      }
    },
  });

  wss.on("connection", function (ws, req) {
    const stream = new WebSocketJSONStream(ws);
    backend.listen(stream, req.user);
  });

  server.listen(8080);

  console.log("Listening on http://localhost:8080");
}

startServer();
