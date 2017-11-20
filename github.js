const router = require('express').Router()
const axios = require('axios')
const admin = require('firebase-admin')

// firebase setup
var serviceAccount = require('./secrets.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
var db = admin.firestore()
const caches = db.collection('caches')
const boilerplates = db.collection('boilerplates')

const date = new Date()
const cacheDate =
  date.getMonth() + 1 + '-' + date.getDate() + '-' + date.getFullYear()

let interval

// github
var cred = require('./gitsecrets.json')
async function getGitHub(url, options) {
  console.log('get git route:', url)
  let items
  return axios
    .get(`https://api.github.com${url}`, options)
    .then(res => res.data)
    .then(res => res.items)
    .catch(err => console.log(err))
}

const search = page => {
  if (!page) page = 1
  const configuration = { headers: { 'User-Agent': 'BoilerPlatePro' } }
  const query = 'boilerplate'
  const sort = 'stars'
  const order = 'desc'
  const criteria = `?q=${query}&sort=${sort}&order=${order}&per_page=100&page=${page}`
  const server = `&client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${cred.GITHUB_CLIENT_SECRET}`
  return getGitHub(`/search/repositories${criteria}${server}`, configuration)
}

function saveBatch(results) {
  const batch = db.batch()
  results.forEach(repo => {
    // console.log('repoId:', repo.id)
    // console.log('repo name:', repo.name)
    const id = repo.id.toString()
    batch.set(db.collection('boilerplates').doc(id), repo)
  })
  return batch.commit().then(data => {
    console.log('batch saved. size:', data.length)
  })
}

async function gather(limit) {
  if (!limit) limit = 1
  let pagePointer = 1
  results = []

  while (pagePointer <= limit) {
    let result = await search(pagePointer)
    console.log('pointer @', pagePointer)
    console.log('result size:', result.length)
    results = results.concat(result)
    pagePointer++
  }
  console.log('----FINAL SIZE:', results.length)
  saveBatch(results)
  return results
}

router.get('/1', (req, res, next) => {
  const items = gather(3)
  console.log('items length', items.length)
  res.json(items)
})

router.get('/', (req, res, next) => {
  console.log('hit')
  // res.send(cacheDate)
  caches
    .doc(cacheDate)
    .get()
    .then(doc => {
      console.log('... checking if we ran the cache today')
      if (!doc.exists) {
        console.log('we have not run the cache today' + cacheDate)
        return caches
          .doc(cacheDate)
          .set({ retrieved: true })
          .then(_ => gather(3))
          .then(stored => res.json(stored))
          .catch(next)
      } else {
        console.log('already cached')
        res.send(`already cached ${cacheDate}`)
      }
    })
    .catch(next)
})

module.exports = router
