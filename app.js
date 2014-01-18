// TODO
//
// Figure out how to deploy app. Why isn't it working when run from DigitalOcean???
// Get package and deploy pipeline for frontend
//
var WebSocketServer = require('ws').Server;
var EventEmitter = require('events').EventEmitter;
var util = require("util");
var FULL_GAME_SIZE = 3;
// max game length = WINNING_SCORE
// min game length = WINNING_SCORE / (FULL_GAME_SIZE - 1)
var WINNING_SCORE = (FULL_GAME_SIZE - 1) * 5;
var port = process.env.PORT || 8080

var clientIdIncrementer = 1;

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

// FIXME: weird interface, not sure about this
var Round = function(players) {
  this.remainingVoters = players.slice(0);
  this.submissions = [];
};
Round.prototype.remainingVoters = null;
Round.prototype.submissions = null;
Round.prototype.voting = false;
Round.prototype.getVotingState = function(player) {
  var obj = {
    submissions: this.submissions.map(function(submission) {
                   var obj = {
                     content: submission.content,
                     id: submission.id
                   };
                   if (submission.player === player) {
                     obj['player'] = player.id;
                   }
                   return obj;
                 }),
    voting: this.voting
  };
  if (this.voting) {
    obj['remainingVoters'] = this.remainingVoters.map(function(player) {
      return player.id;
    });
  }
  return obj;
};
Round.prototype.getHistoryState = function() {
  return {
    submissions: this.submissions.map(function(submission) {
                   return {
                     content: submission.content,
                     id: submission.id,
                     player: submission.player.id,
                     score: submission.getScore()
                   };
                 })
  };
};

var Player = function() {
  this.id = Player.idIncrementer++;
};
Player.idIncrementer = 1;
Player.prototype.name = '';
// this is a denormalized value and can be derived from the round submission scores
Player.prototype.score = 0;
Player.prototype.getState = function() {
  return {
    id: this.id,
    name: this.name,
    score: this.score
  }
};

var Submission = function() {
  this.id = Submission.idIncrementer++;
  this.votes = [];
};
Submission.idIncrementer = 1;
Submission.prototype.content = '';
Submission.prototype.player = null;
Submission.prototype.votes = null;
Submission.prototype.getScore = function() {
  return this.votes.length;
}

var AStorytellingGameServer = new WebSocketServer({port: port});
AStorytellingGameServer.pendingGame = null;
AStorytellingGameServer.on('connection', function(ws) {
  var currentPlayer;
  var currentGame;
  var clientId = clientIdIncrementer++;
  var log = function() {
    args = ['[%s] %s'];
    args.push(clientId);
    args.push(util.format.apply(util, Array.prototype.slice.call(arguments, 0)));
    console.log.apply(this, args);
  };
  log('Client connected.');
  ws.on('message', function(message) {
    try {
      var messageObj = JSON.parse(message);
    } catch(e) {
      log('Failed to parse message: %s', e);
      ws.send(JSON.stringify({
        code: 'clientError',
        message: 'I could not parse your JSON.'
      }));
      return;
    }
    switch(messageObj.code) {
      case 'identifyResponse':
        log('Received identification response as %s', messageObj.name);
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
        currentPlayer = new Player();
        currentPlayer.name = messageObj.name;
        currentGame = AStorytellingGameServer.pendingGame;
        ws.send(JSON.stringify({
          code: 'currentPlayerUpdate',
          player: currentPlayer.getState(currentPlayer)
        }));
        currentGame.on(Game.PLAYER_JOINED, function() {
          ws.send(JSON.stringify({
            code: 'playerJoined',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.on(Game.FINISHED, function() {
          ws.send(JSON.stringify({
            code: 'finished',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.on(Game.SUBMISSIONS_REQUESTED, function() {
          ws.send(JSON.stringify({
            code: 'submit',
            message: 'Please submit your content. Send a response like {"code":"submitResponse","content":"Dr. Frankenstein was busy at work."}',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.on(Game.SUBMISSION_RECEIVED, function() {
          ws.send(JSON.stringify({
            code: 'submissionReceived',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.on(Game.VOTES_REQUESTED, function() {
          ws.send(JSON.stringify({
            code: 'vote',
            message: 'Please send your vote. Send something like {"code":"voteResponse","submission":5}',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.on(Game.VOTE_RECEIVED, function() {
          ws.send(JSON.stringify({
            code: 'voteReceived',
            game: currentGame.getState(currentPlayer)
          }));
        });
        currentGame.addPlayer(currentPlayer);
        break;
      case 'submitResponse':
        if (currentGame.currentRound.submissions.some(function(s) { return s.player === currentPlayer })) {
          log('Submission rejected from %s, since the player already submitted.', currentPlayer.name);
          ws.send(JSON.stringify({
            code: 'submitRejected',
            message: 'You have already submitted.'
          }));
        } else {
          var submission = new Submission();
          submission.player = currentPlayer;
          submission.content = messageObj.content;
          currentGame.currentRound.submissions.push(submission);
          log('Submission received by %s: %s', currentPlayer.name, submission.content);
          currentGame.emit(Game.SUBMISSION_RECEIVED);
          // FIXME: move elsewhere?
          if (currentGame.currentRound.submissions.length === currentGame.getNumExpectedSubmissions()) {
            console.log('Game %d advancing to voting round.', currentGame.id);
            currentGame.currentRound.voting = true;
            currentGame.emit(Game.VOTES_REQUESTED);
          }
        }
        break;
      case 'voteResponse':
        var submissionId = messageObj.submission;
        var currentRound = currentGame.currentRound;
        if (!currentRound.voting) {
          log('Vote received from %s, but voting is not open.', currentPlayer.name);
          ws.send(JSON.stringify({
            code: 'voteRejected',
            message: 'Voting is not currently open.'
          }));
          break;
        }
        // this logic probably has room for improvement/may not belong here and should be in the model instead
        if (currentRound.remainingVoters.indexOf(currentPlayer) === -1) {
          log('Vote rejected from %s, who is not on the remaining voter roll.', currentPlayer.name);
          ws.send(JSON.stringify({
            code: 'voteRejected',
            message: 'You are not on the voter roll. Have you already voted this round?'
          }));
          break;
        }
        var matches = currentRound.submissions.filter(function(s) {
          return s.id === submissionId;
        });
        if (matches.length !== 1) {
          log('Vote received for submission %d, but could not find.', submissionId);
          ws.send(JSON.stringify({
            code: 'voteRejected',
            message: 'Could not find submission with id ' + submissionId
          }));
          break;
        }
        var submission = matches[0];
        if (submission.player === currentPlayer) {
          log('Vote rejected from %s for submission %d since it was own submission.', currentPlayer.name, submissionId);
          ws.send(JSON.stringify({
            code: 'voteRejected',
            message: 'You cannot vote for your own submission.'
          }));
          break;
        }
        submission.votes.push(currentPlayer);
        currentRound.remainingVoters.splice(currentRound.remainingVoters.indexOf(currentPlayer), 1);
        // weird place to put this?
        currentGame.emit(Game.VOTE_RECEIVED);
        if (currentRound.remainingVoters.length === 0) {
          currentGame.endRound();
          if (!currentGame.finished) {
            currentGame.startRound();
          }
        }
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
