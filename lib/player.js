var Game = require('./game');
var Player = function() {
  this.id = Player.idIncrementer++;
};
Player.idIncrementer = 1;
Player.prototype.name = '';
Player.prototype.currentGame = null;
// this is a denormalized value and can be derived from the round submission scores
Player.prototype.score = 0;
Player.prototype.getState = function() {
  return {
    id: this.id,
    name: this.name,
    score: this.score
  }
};
/**
 * Join a game. Sets the player's current game.
 * TODO: Support joining multiple games at a time.
 */
Player.prototype.join = function(game) {
  this.currentGame = game;
}
/**
 * Connect a WebSockets connection to this player. Can be called as many times
 * as you like for as many WebSockets clients as you like on a player. Useful
 * for reconnection and for multiple clients.
 */
Player.prototype.connect = function(ws) {
  var game = this.currentGame;
  ws.send(JSON.stringify({
    code: 'currentPlayerUpdate',
    player: this.getState(this)
  }));
  game.on(Game.PLAYER_JOINED, function() {
    ws.send(JSON.stringify({
      code: 'playerJoined',
      game: game.getState(this)
    }));
  });
  game.on(Game.SUBMISSIONS_REQUESTED, function() {
    ws.send(JSON.stringify({
      code: 'submit',
      message: 'Please submit your content. Send a response like {"code":"submitResponse","content":"Dr. Frankenstein was busy at work."}',
      game: game.getState(this)
    }));
  });
  game.on(Game.SUBMISSION_RECEIVED, function() {
    ws.send(JSON.stringify({
      code: 'submissionReceived',
      game: game.getState(this)
    }));
  });
  game.on(Game.FINISHED, function() {
    ws.send(JSON.stringify({
      code: 'finished',
      game: game.getState(this)
    }));
  });
  game.on(Game.VOTES_REQUESTED, function() {
    ws.send(JSON.stringify({
      code: 'vote',
      message: 'Please send your vote. Send something like {"code":"voteResponse","submission":5}',
      game: game.getState(this)
    }));
  });
  game.on(Game.VOTE_RECEIVED, function() {
    ws.send(JSON.stringify({
      code: 'voteReceived',
      game: game.getState(this)
    }));
  });
}

module.exports = Player;
