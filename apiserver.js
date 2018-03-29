var jenny = require('./index');
var express = require('express')
var bodyParser = require('body-parser')

var app = express()
var jsonParser = bodyParser.json()


app.get('/', function(req, res, next) {
  res.send('sup')
})

const awaitHandlerFactory = (middleware) => {
  return async (req, res, next) => {
    try {
      await middleware(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

app.post('/urlfetch', jsonParser, awaitHandlerFactory(async (req, res) => {
  if (!req.body) return res.sendStatus(400)

  //var url=req.body.url
  //var proxy=req.body.proxy
  //var useragent=req.body.useragent

  var result=await jenny.fetch(req.body)
  res.setHeader('Content-Type', 'application/json')
  var ret = JSON.stringify(result)
  res.send(ret)
  res.end()
  //exit after every request 
  //server.close()
}))

var server=app.listen(3000)
