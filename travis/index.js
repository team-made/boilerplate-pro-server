const router = require('express').Router()
const axios = require('axios')
// const { getGitHub, search, getLanguages, getRateLimit } = require('./utils')
// const admin = require('firebase-admin')




router.post('/',(req, res, next) => {
  console.log('type: ', typeof request.body, 'req:', request.body, 'DATA token:', Object.keys(request.body)[0])
  const token = Object.keys(request.body)[0]
  const config = {
    headers: {
      Accept: 'application/vnd.travis-ci.2+json',
      'User-Agent': 'MyClient/1.0.0',
      Host: 'api.travis-ci.org',
      'Content-Type': 'application/json'
    }
  }
  axios
    .post(
      'https://api.travis-ci.org/auth/github',
      { github_token: token },
      config
    )
    .then(res => {
      console.log('res', res)
      response.status(200).send(res)
    })
    .catch(err => response.status(500).send('ERROR', err))
})
