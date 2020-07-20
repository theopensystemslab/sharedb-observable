const WebSocketJSONStream = require("@teamwork/websocket-json-stream");
const express = require("express");
const http = require("http");
const ShareDB = require("sharedb");
const { Server } = require("ws");

var backend = new ShareDB();

// createDoc(startServer);

// (now doing this in the client instead, so that the ID can be dynamic)
// function createDoc(callback) {
//   var connection = backend.connect();
//   var doc = connection.get("examples", "test");
//   doc.fetch(function (err) {
//     if (err) throw err;
//     if (doc.type === null) {
//       doc.create({ nodes: {}, edges: [] }, callback);
//       return;
//     }
//     callback();
//   });
// }

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections
  var app = express();
  app.use(express.static("static"));
  var server = http.createServer(app);

  // Connect any incoming WebSocket connection to ShareDB
  var wss = new Server({ server });
  wss.on("connection", function (ws) {
    var stream = new WebSocketJSONStream(ws);
    backend.listen(stream);
  });

  server.listen(8080);
  console.log("Listening on http://localhost:8080");
}

startServer();
