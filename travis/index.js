const router = require('express').Router()
const axios = require('axios')
// const { getGitHub, search, getLanguages, getRateLimit } = require('./utils')
// const admin = require('firebase-admin')

router.post('/', (request, response, next) => {
  console.log('req:', request.body)
  const { token, username, repo } = request.body
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
      console.log('Travis response token:', res.data.access_token)
      return res.data.access_token
    })
    .then(travisToken => {
      const authConfig = Object.assign({}, config, {
        headers: { Authorization: `token ${travisToken}` }
      })
      console.log('auth', authConfig)
      return axios
        .get(`https://api.travis-ci.org/repos/${username}/${repo}`, authConfig)
        .then(res => console.log(res) || response.status(200).send(res.data))
    })
    .catch(next)
})

module.exports = router
