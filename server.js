const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 9090

/*
  THE COMMENTED OUT CODE BELOW IS FOR FUTURE REFERENCE. DO NOT ERASE.
*/
// const schedule = require('node-schedule')
// var counter = 0
// var j = schedule.scheduleJob('0 * * * * *', function() {
//   console.log('The answer to life, the universe, and everything!', counter)
//   counter++
// })

// logging middleware
app.use(morgan('dev'))

// body parsing middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// handle CORS and OPTIONS request method
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  console.log('REQ.METHOD:', req.method)
  if ('OPTIONS' === req.method) return res.sendStatus(200)
  console.log('should not be OPTIONS:', req.method)
  next()
})

// auth and api routes
app.use('/github', require('./github'))
app.use('/travis', require('./travis'))

// main entry point for server
app.use('/', (req, res, next) => {
  res.send(`yo dog`)
})

// error handling
app.use((err, req, res, next) => {
  console.error(err)
  console.error(err.stack)
  res.status(err.status || 500).send(err.message || 'Internal server error.')
})

app.use('*', (req, res, next) => {
  res.send(
    `ERROR -> yo dog you are hitting routes that do not exist. try not to do that`
  )
})

const server = app.listen(PORT, () => console.log(`Boiling up on port ${PORT}`))
