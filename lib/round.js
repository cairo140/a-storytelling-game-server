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

module.exports = Round;
