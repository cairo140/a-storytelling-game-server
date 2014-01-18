var EventEmitter = require('events').EventEmitter;
var Round = require('./round');
var util = require("util");
var FULL_GAME_SIZE = 3;
var WINNING_SCORE = (FULL_GAME_SIZE - 1) * 5;
var Game = function() {
  this.id = Game.idIncrementer++;
  this.players = [];
  this.pastRounds = [];
};
util.inherits(Game, EventEmitter);
Game.idIncrementer = 1;
Game.FINISHED = 'FINISHED';
Game.FULL = 'FULL';
Game.PLAYER_JOINED = 'PLAYER_JOINED';
Game.SUBMISSIONS_REQUESTED = 'SUBMISSIONS_REQUESTED';
Game.SUBMISSION_RECEIVED = 'SUBMISSION_RECEIVED';
Game.VOTES_REQUESTED = 'VOTES_REQUESTED';
Game.VOTE_RECEIVED = 'VOTE_RECEIVED';
Game.prototype.currentRound = null;
Game.prototype.finished = false;
Game.prototype.players = null;
Game.prototype.pastRounds = null;
Game.prototype.addPlayer = function(player) {
  this.players.push(player);
  this.emit(Game.PLAYER_JOINED);
  if (this.players.length === FULL_GAME_SIZE) {
    this.emit(Game.FULL);
    this.startRound();
  }
};
Game.prototype.getNumExpectedSubmissions = function() {
  return this.players.length;
};
Game.prototype.getState = function(player) {
  return {
    currentRound: this.currentRound === null ? null : this.currentRound.getVotingState(player),
    finished: this.finished,
    id: this.id,
    players: this.players.map(function(player) {
               return player.getState();
             }),
    pastRounds: [{submissions:[{content: 'It was a dark and stormy night.'}]}].concat(
                    this.pastRounds.map(function(round) {
                      return round.getHistoryState()
                    })
                  )

  }
};
// FIXME: this feels semi-bad
Game.prototype.startRound = function() {
  this.currentRound = new Round(this.players);
  // this seems like an encapsulation break... should it be the round requesting submissions?
  this.emit(Game.SUBMISSIONS_REQUESTED);
};
Game.prototype.endRound = function() {
  this.pastRounds.push(this.currentRound);
  this.currentRound.submissions.forEach(function(submission) {
    submission.player.score += submission.getScore();
  });
  this.currentRound = null;
  var finished = this.players.some(function(player) {
    return player.score > WINNING_SCORE;
  });
  if (finished) {
    this.finished = true;
    this.emit(Game.FINISHED);
  }
};

module.exports = Game;
