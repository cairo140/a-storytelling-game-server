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

module.exports = Submission;
