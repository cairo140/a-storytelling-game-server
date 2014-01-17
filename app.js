// redis = require 'redis'
// redisClient = redis.createClient()

var WebSocketServer = require('ws').Server;
var port = process.env.PORT || 8080

var clientIdIncrementer = 0;

var Game = function() {};
Game.prototype.participants = [];
Game.prototype.currentRoundSubmissions = [];

var AStorytellingGameServer = new WebSocketServer({port: port});
AStorytellingGameServer.pendingGame = null;
AStorytellingGameServer.on('connection', function(ws) {
  var clientId = clientIdIncrementer++;
  var log = function(message) {
    console.log.call(this, '[%s] %s', arguments.slice(1));
  };
  log('Client connected.');
  ws.on('message', function(message) {
    var messageObj = JSON.parse(message);
    switch(messageObj.code) {
      case 'identifyResponse':
        log('Received identification response as %s', messageObj.name);
        break;
      default:
        log('Unrecognized code %s', messageObj.code);
    }
  });
  ws.send(JSON.stringify({
    code: 'identify',
    message: 'Please identify yourself. Send a response like {"code":"identifyResponse","name":"Bill Clinton"}'
  }));
});

console.log('Server started on port %s.', port);
