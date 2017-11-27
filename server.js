const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 9090

// const schedule = require('node-schedule')

var counter = 0
// var j = schedule.scheduleJob('0 * * * * *', function() {

//   console.log('The answer to life, the universe, and everything!', counter)
//   counter++
// })

app.use(morgan('dev'))

// body parsing middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  if ('OPTIONS' === req.method) return res.sendStatus(200)
  next()
})
// auth and api routes
app.use('/github', require('./github'))
app.use('/travis', require('./travis'))
app.use('/', (req, res, next) => {
  res.send(` -> yo dog ${counter}`)
})

// error handling
app.use((err, req, res, next) => {
  console.error(err)
  console.error(err.stack)
  res.status(err.status || 500).send(err.message || 'Internal server error.')
})

app.use('*', (req, res, next) => {
  res.send(`POST ERROR -> yo dog i heard you like counters: ${counter}`)
})

const server = app.listen(PORT, () => console.log(`Boiling up on port ${PORT}`))
