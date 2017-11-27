const axios = require('axios')

async function getGitHub(url, options) {
  console.log('get git route:', url)
  let items
  return axios
    .get(`https://api.github.com${url}`, options)
    .then(res => res.data)
    .catch(err => console.log(err))
}

var cred = require('../gitsecrets.json')
const configuration = { headers: { 'User-Agent': 'BoilerPlatePro' } }

const search = page => {
  if (!page) page = 1
  const query = 'boilerplate'
  const sort = 'stars'
  const order = 'desc'
  const criteria = `?q=${query}&sort=${sort}&order=${order}&per_page=100&page=${
    page
  }`
  const server = `&client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${
    cred.GITHUB_CLIENT_SECRET
  }`
  return getGitHub(`/search/repositories${criteria}${server}`, configuration)
}

const getLanguages = ownerSlashName => {
  const server = `?client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${
    cred.GITHUB_CLIENT_SECRET
  }`
  console.log('getting language for', ownerSlashName)
  return getGitHub(`/repos/${ownerSlashName}/languages${server}`, configuration)
}

const getRateLimit = () => {
  const server = `?client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${
    cred.GITHUB_CLIENT_SECRET
  }`
  return getGitHub(`/rate_limit${server}`, configuration)
}

module.exports = { getGitHub, search, getLanguages, getRateLimit }
