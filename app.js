var redis, redisClient;
if (process.env.REDISTOGO_URL) {
  redisClient = require('redis-url').connect(process.env.REDISTOGO_URL);
} else {
  redis = require('redis');
  redisClient = redis.createClient();
}
var ws = require('ws');
var WebSocketServer = ws.Server;

var port = process.env.PORT || 8080
var AStorytellingGame = new WebSocketServer({port: port});
AStorytellingGame.on('connection', function(ws) {
  ws.on('message', function(message) {
    console.log('Received: %s', message);
    ws.send(message);
  });
  ws.send(JSON.stringify({"status":"success"}));
});

console.log('Server started on port ' + port + '.');
