const { firebase } = require('@firebase/app/dist/cjs')
const cred = require('../github-auth')
const { db } = require('../firebase-auth')
const sendToAlgolia = require('../algolia/utils.js')
const axios = require('axios')
const date = new Date()

// variables necessary for these utilities
const configuration = { headers: { 'User-Agent': 'BoilerPlatePro' } }
const serverID = `client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${
  cred.GITHUB_CLIENT_SECRET
}`

const caches = db.collection('caches')
const boilerplates = db.collection('boilerplates')

const cacheDate =
  date.getMonth() + 1 + '-' + date.getDate() + '-' + date.getFullYear()

// get github returns axios on url with options
function getGitHub(url, appended = false) {
  console.log('get git route:', url)
  const append = appended ? '&' + serverID : '?' + serverID
  return axios.get(`https://api.github.com${url}${append}`, configuration)
}

// returns promise (axios.get) for github search results
function search(page) {
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
  return getGitHub(`/search/repositories${criteria}`, true).then(
    res => res.data
  )
}

// posts result batch to firestore
// takes an array of repos from github
function sendToFireStore(results) {
  console.log('--> FIRESTORE: now attempting to store repos')
  const batch = db.batch()
  results.forEach(repo => {
    const id = repo.id.toString()
    batch.set(boilerplates.doc(id), repo)
  })
  batch
    .commit()
    .then(data => {
      console.log(`--> FIRESTORE: ${data.length} repos saved`)
    })
    .catch(err => console.log('--> FIRESTORE: error saving.', err))
}

// gather creates get request for every page of search
// takes a limit for the number of pages to gather
// and send to save batch
function gatherRepos(limit) {
  if (!limit) limit = 1
  let pagePointer = 1

  while (pagePointer <= limit) {
    search(pagePointer)
      .then(res => res.items)
      .then(searchResults => {
        console.log('on page', pagePointer)
        console.log('search results', searchResults.length)
        sendToFireStore(searchResults)
        sendToAlgolia(searchResults)
      })
      .catch(error => console.log('FAIL! FAIL! FAIL! FAIL!', error))
    pagePointer++
  }
  // console.log('--------Total amount of results:', results.length)
}

// returns promise (axios.get) for the contents of README
function getReadMe(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/readme`).then(res => res.data)
}

// returns promise (axios.get) for the contents of package.json
function getPackageJSON(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/contents/package.json`).then(
    res => res.data
  )
}

// returns promise (axios.get) for languages used in a github repo
function getLanguages(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/languages`).then(res => res.data)
}

// returns promise (axios.get) for servers rate limit from github
function getRateLimit() {
  return getGitHub(`/rate_limit`)
}

module.exports = { getRateLimit, getLanguages, gatherRepos }
