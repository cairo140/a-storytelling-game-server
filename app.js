var redis = require('redis');
var io = require('socket.io').listen(8080);

io.sockets.on('connection', function (socket) {
  var client = redis.createClient();
  client.incr('hits', function(err, result) {
    socket.emit('welcome', result);
    socket.once('anonymous', function () {
      socket.emit('authenticated', {type: 'anonymous'});
    });
  });

  socket.once('disconnect', function(){
    console.log('Disconnected.');
    client.quit();
  });
});
