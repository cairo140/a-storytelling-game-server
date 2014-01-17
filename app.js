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
  var log = function() {
    args = ['[%s] %s'];
    args.push(clientId);
    args = args.concat(Array.prototype.slice.call(arguments, 0));
    console.log.apply(this, args);
  };
  log('Client connected.');
  ws.on('message', function(message) {
    try {
      var messageObj = JSON.parse(message);
    } catch(e) {
      log('Failed to parse message: ' + e);
      ws.send(JSON.stringify({
        code: 'clientError',
        message: 'I could not parse your JSON.'
      }));
      return;
    }
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
