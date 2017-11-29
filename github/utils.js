const cred = require('../github-auth')
const { db } = require('../firebase-auth')
const sendToAlgolia = require('../algolia/utils.js')

const lodash = require('lodash')
const chunk = lodash.chunk

const axios = require('axios')

// variables necessary for these utilities
const configuration = { headers: { 'User-Agent': 'BoilerPlatePro' } }
const serverID = `client_id=${cred.GITHUB_CLIENT_ID}&client_secret=${
  cred.GITHUB_CLIENT_SECRET
}`

// get github returns axios on url with options
function getGitHub(url, appended = false) {
  console.log('get git route:', url)
  const append = appended ? '&' + serverID : '?' + serverID
  return axios.get(`https://api.github.com${url}${append}`, configuration)
}

// returns promise (axios.get) for github search results
function search(
  query = 'boilerplate',
  sort = 'stars',
  order = 'desc',
  page = 1
) {
  const criteria = `?q=${query}&sort=${sort}&order=${order}&per_page=100&page=${
    page
  }`
  return getGitHub(`/search/repositories${criteria}`, true).then(
    res => res.data.items
  )
}

// takes a large array and breaks it into chunks for easier posting
// returns an array consisting of arrays.
// Nested arrays are chunks of original bigArray data
function chunkArray(bigArray) {
  const CHUNK_SIZE = 200
  return chunk(bigArray, CHUNK_SIZE)
}

// posts result batch to firestore
// takes an array of repos from github
function sendToFireStore(results) {
  const chunks = chunkArray(results)
  console.log(
    ` --> FIRESTORE: .... now attempting to store ${
      results.length
    } repos split into ${chunks.length} chunks`
  )
  chunks.map((batch, batchNumber) => {
    const batchStore = db.batch()
    batch.forEach(repo => {
      const id = repo.id
      console.log('==============================', id)
      const repoRef = db.collection('boilerplates').doc(id.toString())
      const storeRepo = lodash.cloneDeep(repo)
      console.log(`# setting to batch # ${storeRepo.full_name}`)
      batchStore.set(repoRef, repo)
    })
    batchStore
      .commit()
      .then(data => {
        console.log(
          ` --> FIRESTORE (CHUNK ${batchNumber + 1} of ${
            chunks.length
          }): SUCCESS! ${data.length} repos saved`
        )
      })
      .catch(err =>
        console.log(
          ` --> FIRESTORE (CHUNK ${batchNumber + 1} of ${
            chunks.length
          }): ERROR! saving.`,
          err
        )
      )
  })
}

// returns a promise that will fulfill with search results for X pages of query search
function gatherRepos(
  query,
  sort = '',
  order = '',
  limit = 1,
  initialDelay = 0,
  delayIncrement = 7000
) {
  if (!query) throw new Error('Missing search query in gatherRepos')
  const searchPagePromiseArr = []
  for (
    var pagePointer = 1, delay = initialDelay;
    pagePointer <= limit;
    pagePointer++, delay += delayIncrement
  ) {
    const searchPage = new Promise((resolve, reject) => {
      const currPage = pagePointer
      console.log(
        `.... making new promise to search for ${query} on page ${
          currPage
        }  | delayed start in ${delay} ms`
      )
      const resolveSearch = () => {
        console.log(
          `.... now resolving search for ${query} on page ${currPage}`
        )
        return resolve(search(query, sort, order, currPage))
      }
      setTimeout(resolveSearch, delay)
    })
    searchPagePromiseArr.push(searchPage)
  }

  return Promise.all(searchPagePromiseArr).then(results => {
    return lodash.flattenDeep(results)
  })
}
// returns promise (axios.get) for the contents of README
function getReadMe(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/readme`)
    .then(res => res.data)
    .then(info => {
      return base64Decode(info.content)
    })
}

// returns promise (axios.get) for the contents of package.json
function getPackageJSON(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/contents/package.json`)
    .then(res => res.data)
    .then(file => {
      const data = JSON.parse(base64Decode(file.content))
      return lodash.pick(data, ['dependencies', 'devDependencies'])
    })
}

// returns promise (axios.get) for languages used in a github repo
function getLanguages(ownerSlashName) {
  return getGitHub(`/repos/${ownerSlashName}/languages`).then(res => res.data)
}

function whichLangDep(lang) {
  switch (lang) {
    case 'JavaScript':
      return getPackageJSON
      break
    default:
      // for unsupported languages
      return function(arg) {
        return Promise.resolve()
      }
  }
}

// retruns chained promise (axios.get) that appends info
// final promise returns new repo object with add info
function getRepoAddInfo(repo) {
  const ownerSlashName = repo.full_name
  const id = repo.id
  let repoWithAddInfo = lodash.cloneDeep(repo)
  repoWithAddInfo.objectID = parseInt(id)
  return whichLangDep(repoWithAddInfo.language)(ownerSlashName)
    .then(dependencies => {
      console.log(
        ` = = = = = = = = = = = = = = = = = = DEPENDENCIES: ${dependencies}`
      )
      repoWithAddInfo.uses = dependencies || false
      console.log(
        ` = = = = = = = = = = = = = = = = = = repoWithAddInfo.uses: ${
          repoWithAddInfo.uses
        }`
      )
      return getReadMe(ownerSlashName)
    })
    .catch(noReadMe => {
      console.log(` - no readme file found for ${ownerSlashName}`)
      return 'no readme file found'
    })
    .then(readme => {
      repoWithAddInfo.readMe = readme
      return repoWithAddInfo
    })
}

// returns a promise.all to fetch additional info for input array of repo objects
function getAllReposInfo(repos, initialDelay = 4000, delayIncrement = 4000) {
  const promisesArr = []
  for (
    var index = 0, delay = initialDelay;
    index < repos.length;
    index++, delay += delayIncrement
  ) {
    const getRepoInfo = new Promise((resolve, reject) => {
      const currPage = index + 1
      const currRepo = repos[index]
      const resolveInfo = () => {
        const percent = currPage / repos.length
        console.log(
          `.... now resolving additional info for ${currRepo.full_name} (repo ${
            currPage
          }  of ${repos.length}) [${percent}%]`
        )
        return resolve(getRepoAddInfo(currRepo))
      }
      setTimeout(resolveInfo, delay)
    })
    promisesArr.push(getRepoInfo)
  }

  return Promise.all(promisesArr).then(results => {
    const flat = lodash.flattenDeep(results)
    console.log(
      `[[[[[[[[[[[[ gathered all additional info for ${
        flat.length
      } repos ]]]]]]]]]]]]`
    )
    return flat
  })
}

// returns promise (axios.get) for servers rate limit from github
function getRateLimit() {
  return getGitHub(`/rate_limit`)
    .then(res => res.data)
    .then(results => {
      results.resources.core.converted = new Date(
        results.resources.core.reset * 1000
      )
      results.resources.search.converted = new Date(
        results.resources.search.reset * 1000
      )
      results.resources.graphql.converted = new Date(
        results.resources.graphql.reset * 1000
      )
      results.rate.converted = new Date(results.rate.reset * 1000)
      return results
    })
}

function base64Decode(b64string) {
  const buff = new Buffer(b64string, 'base64')
  return buff.toString('ascii')
}

// input: an array of search term objects (keys: term, sortBy, orderBy, pageLimit)
// returns a promise that will completed requested search and store results
function searchMaster(searchTermsArray) {
  // delay before starting search
  const initDelay = 1000
  // how much time to spend between queries for a sningle search page
  const incrementDelay = 10000
  const searchPromiseArr = []

  searchTermsArray.forEach((searchItem, searchTermNumber) => {
    const NEW_INIT_DELAY = searchTermNumber
      ? incrementDelay * searchTermNumber + initDelay
      : initDelay

    searchPromiseArr.push(
      gatherRepos(
        searchItem.term,
        searchItem.sortBy,
        searchItem.orderBy,
        searchItem.pageLimit,
        NEW_INIT_DELAY,
        incrementDelay
      )
    )
  })

  return Promise.all(searchPromiseArr).then(results => {
    const flat = lodash.flattenDeep(results)
    console.log(
      `[[[[[[[[[[[[[[ TOTAL REPOS SCRAPED: ${flat.length} ]]]]]]]]]]]]]]`
    )
    const unique = lodash.uniqBy(flat, 'id')
    console.log(
      `[[[[[[[[[[[[[[[ TOTAL UNIQUE REPOS SCRAPED: ${
        unique.length
      } ]]]]]]]]]]]]]]]`
    )
    return unique
  })
}

function test(searchTermsArray) {
  const hold_array = searchTermsArray
  return setRepoUpdateState().then(_ => {
    console.log('hold array', hold_array, 'searchTermsArray', searchTermsArray)
  })
}

// The function that does it all!!
function searchParseCache(searchTermsArray) {
  return setRepoUpdateState()
    .then(_ => searchMaster(searchTermsArray))
    .then(uniqueRepos => {
      return getAllReposInfo(uniqueRepos, 1000, 3000)
    })
    .then(finalRepos => {
      console.log(`--> --> --> ${finalRepos.length} <-- <-- <--`)
      console.log(
        `[[[[[[[[[[[[[[ SENDING OFF REPOS & INFO FOR SAVING ]]]]]]]]]]]]]]`
      )
      repoCountStats(finalRepos.length)
      sendToFireStore(finalRepos)
      sendToAlgolia(finalRepos)
      return finalRepos
    })
}

// returns a promise
// updates firestore to indicate cache has begun with start timestamp
function setRepoUpdateState() {
  const now = new Date()
  console.log(
    `[[[[[[[[[[[[ TELLING FIREBASE REPO CACHE UPDATE HAS BEGUN ]]]]]]]]]]]]`
  )
  return db
    .collection('site-stats')
    .doc('repos')
    .update({ status: 'updating', lastCacheStart: now })
    .then(_ => {
      return console.log(
        ` --> FIREBASE: SUCCESS! updated db cache status - ${now}`
      )
    })
    .catch(err =>
      console.log(
        ` --> FIREBASE: FAIL! could not tell db we started cache\n\n`,
        err
      )
    )
}

// returns a promise
// updates firestore with complete status, repo count, and finish timestamp
function repoCountStats(repoCount) {
  const now = new Date()
  const count = repoCount
  return db
    .collection('site-stats')
    .doc('repos')
    .update({ count: repoCount, lastCacheEnd: now, status: 'done' })
    .then(_ => {
      console.log(
        ` --> FIREBASE: SUCCESS! updated site stats to show new repo count (${
          count
        }) on ${now}`
      )
    })
    .catch(err =>
      console.error(
        ` --> FIREBASE: FAIL! could not update site stats with repo count\n\n`,
        err
      )
    )
}

module.exports = {
  searchMaster,
  getRateLimit,
  getLanguages,
  gatherRepos,
  getPackageJSON,
  getReadMe,
  base64Decode,
  getRepoAddInfo,
  getAllReposInfo,
  sendToFireStore,
  repoCountStats,
  setRepoUpdateState,
  test,
  searchParseCache
}
