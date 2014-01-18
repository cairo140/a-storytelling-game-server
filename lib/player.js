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

module.exports = Player;
