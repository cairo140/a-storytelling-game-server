redis = require 'redis'
redisClient = redis.createClient()
ws = require 'ws'

WebSocketServer = ws.Server

port = process.env.PORT || 8080
AStorytellingGame = new WebSocketServer port: port
AStorytellingGame.on 'connection', (ws) ->
  ws.on 'message', (message) ->
    console.log 'Received: %s', message
    ws.send message
  ws.send JSON.stringify(status: "success")

console.log 'Server started on port ' + port + '.'
