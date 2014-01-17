// redis = require 'redis'
// redisClient = redis.createClient()

var WebSocketServer = require('ws').Server;
var EventEmitter = require('events').EventEmitter;
var util = require("util");
var FULL_GAME_SIZE = 3;
var port = process.env.PORT || 8080

var clientIdIncrementer = 0;

var Game = function() {
  this.id = Game.idIncrementer++;
  this.players = [];
  this.rounds = [];
};
util.inherits(Game, EventEmitter);
Game.idIncrementer = 0;
Game.FULL = 'FULL';
Game.PLAYER_JOINED = 'PLAYER_JOINED';
Game.prototype.players = null;
Game.prototype.rounds = null;
Game.prototype.voting = false;
Game.prototype.addPlayer = function(player) {
  this.players.push(player);
  this.emit(Game.PLAYER_JOINED);
  if (this.players.length === FULL_GAME_SIZE) {
    this.emit(Game.FULL);
  }
};
Game.prototype.getState = function() {
  return {
    id: this.id,
    players: this.players.map(function(player) {
               return player.getState();
             })
  }
};

var Round = function() {};
Round.prototype.submissions = [];

var Player = function() {};
Player.prototype.name = '';
// this is a denormalized value and can be derived from the round submission scores
Player.prototype.score = 0;
Player.prototype.getState = function() {
  return {
    name: this.name,
    score: this.score
  }
};

var Submission = function() {};
Submission.prototype.content = '';
Submission.prototype.player = null;
Submission.prototype.score = 0;

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
        log('Received identification response as', messageObj.name);
        if (AStorytellingGameServer.pendingGame === null) {
          var newGame = new Game();
          console.log('Provisioned new game %d.', newGame.id);
          newGame.on(Game.FULL, function() {
            var roster = newGame.players.map(function(p) { return p.name; }).join(', ')
            console.log('Game %d is now full. Players:', newGame.id, roster);
            AStorytellingGameServer.pendingGame = null;
          });
          AStorytellingGameServer.pendingGame = newGame;
        }
        var currentPlayer = new Player();
        currentPlayer.name = messageObj.name;
        var game = AStorytellingGameServer.pendingGame;
        game.addPlayer(currentPlayer);
        ws.send(JSON.stringify({
          code: 'gameUpdate',
          game: game.getState()
        }));
        game.on(Game.PLAYER_JOINED, function() {
          ws.send(JSON.stringify({
            code: 'gameUpdate',
            game: game.getState()
          }));
        });
        break;
      default:
        log('Unrecognized code ', messageObj.code);
    }
  });
  ws.send(JSON.stringify({
    code: 'identify',
    message: 'Please identify yourself. Send a response like {"code":"identifyResponse","name":"Bill Clinton"}'
  }));
});

console.log('Server started on port %s.', port);
