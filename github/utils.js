const { firebase } = require('@firebase/app/dist/cjs')
const cred = require('../github-auth')
const { db } = require('../firebase-auth')
const sendToAlgolia = require('../algolia/utils.js')

const lodash = require('lodash')
const chunk = lodash.chunk

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

// posts result batch to firestore
// takes an array of repos from github
function sendToFireStore(results) {
  const chunks = chunk(results, 1000)
  console.log(
    `--> FIRESTORE: .... now attempting to store ${
      results.length
    } repos split into ${chunks.length} chunks`
  )
  chunks.map((batch, batchNumber) => {
    const batchStore = db.batch()
    batch.forEach(repo => {
      const id = repo.id.toString()
      batch.set(boilerplates.doc(id), repo)
    })
    batchStore
      .commit()
      .then(data => {
        console.log(
          `--> FIRESTORE (CHUNK ${batchNumber}): SUCCESS! ${
            data.length
          } repos saved`
        )
      })
      .catch(err =>
        console.log(`--> FIRESTORE (CHUNK ${batchNumber}): ERROR! saving. err`)
      )
  })
}

function gatherRepos(
  query,
  sort = '',
  order = '',
  limit = 1,
  initialDelay = 0,
  delayIncrement = 10000
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
        // console.log(
        //   ' - FAKE ASYNC CALL BEING DONE FOR',
        //   query,
        //   sort,
        //   order,
        //   currPage
        // )
        // return resolve([{ id: 1, page: currPage }, { id: 2, page: currPage }])
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
  let repoWithAddInfo = lodash.cloneDeep(repo)
  return whichLangDep(repoWithAddInfo.language)(ownerSlashName)
    .then(dependencies => {
      repoWithAddInfo.uses = dependencies
      return getReadMe(ownerSlashName)
    })
    .catch(noReadMe => {
      console.log(`...no readme file found for ${ownerSlashName}`)
      return 'no readme file found'
    })
    .then(readme => {
      repoWithAddInfo.readMe = readme
      return repoWithAddInfo
    })
}

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
      console.log(
        `.... making new promise to get additional info for ${
          currRepo.full_name
        } ( repo ${currPage}  of ${repos.length}) delay: ${delay}`
      )
      const resolveInfo = () => {
        console.log(
          `.... now resolving additional info for ${
            currRepo.full_name
          } ( repo ${currPage}  of ${repos.length})`
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
        results.length
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
  // console.log('readme:', )
  return buff.toString('ascii')
}

function magicSearch(searchTermsArray) {
  // delay before starting search
  const initDelay = 1000
  // how much time to spend between queries for a sningle search page
  const incrementDelay = 10000
  const searchPromiseArr = []

  searchTermsArray.forEach((searchItem, searchTermNumber) => {
    const NEW_INIT_DELAY = !searchTermNumber
      ? initDelay
      : incrementDelay * (searchTermNumber + 1) + initDelay

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

  return Promise.all(searchPromiseArr)
    .then(results => {
      const flat = lodash.flattenDeep(results)
      console.log(`[[[[[[[[[ TOTAL REPOS SCRAPED: ${flat.length} ]]]]]]]]]`)
      const unique = lodash.uniqBy(flat, 'id')
      console.log(
        `[[[[[[[[[ TOTAL UNIQUE REPOS SCRAPED: ${unique.length} ]]]]]]]]]`
      )
      return unique
    })
    .then(uniqueRepos => {
      return getAllReposInfo(uniqueRepos)
    })
    .then(finalRepos => {
      // sendToFireStore(finalRepos)
      // sendToAlgolia(finalRepos)
      return finalRepos
    })
}

module.exports = {
  magicSearch,
  getRateLimit,
  getLanguages,
  gatherRepos,
  getPackageJSON,
  getReadMe,
  base64Decode,
  getRepoAddInfo,
  getAllReposInfo
}
