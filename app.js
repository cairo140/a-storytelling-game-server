var redis = require('redis');
var ws = require('ws')
var WebSocketServer = ws.Server

var AStorytellingGame = new WebSocketServer({port: 8080});
AStorytellingGame.on('connection', function(ws) {
  ws.on('message', function(message) {
    console.log('Received: %s', message);
    ws.send(message);
  });
  ws.send(JSON.stringify({"status":"success"}));
});

console.log('Server started.');
