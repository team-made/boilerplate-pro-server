const router = require('express').Router()
const axios = require('axios')
const Cloner = require('./localClone') // git locally
const {
  getRateLimit,
  getLanguages,
  gatherRepos,
  getPackageJSON,
  getReadMe,
  base64Decode,
  magicSearch,
  getRepoAddInfo,
  getAllReposInfo,
  repoCountStats,
  test,
  setRepoUpdateState,
  sendToFireStore,
  searchParseCache
} = require('./utils')

// router.get('/test', (req, res, next) => {
//   test(['test', 'data'])
//     .then(_ => {
//       res.send('OK')
//     })
//     .catch(next)
// })

// router.get('/setRepoUpdateState', (req, res, next) => {
//   setRepoUpdateState()
//     .then(_ => {
//       res.send('OK')
//     })
//     .catch(next)
// })

// router.get('/repoCountStats', (req, res, next) => {
//   repoCountStats(843).then(_ => {
//     res.send('OK')
//   })
// })

// router.get('/getAllReposInfo', (req, res, next) => {
//   getAllReposInfo([
//     {
//       full_name: 'team-made/boilerplate-pro',
//       language: 'JavaScript'
//     },
//     {
//       full_name: 'team-made/boilerplate-pro-server',
//       language: 'JavaScript'
//     }
//   ])
//     .then(response => res.json(response))
//     .catch(next)
// })

// router.get('/getAdditionalRepoInfo', (req, res, next) => {
//   getAdditionalRepoInfo({
//     full_name: 'team-made/boilerplate-pro',
//     language: 'JavaScript'
//   })
//     .then(response => res.json(response))
//     .catch(next)
// })

// router.get('/json', (req, res, next) => {
//   getPackageJSON('team-made/boilerplate-pro-server')
//     .then(file => {
//       res.json(file)
//     })
//     .catch(next)
// })

// router.get('/readme', (req, res, next) => {
//   getReadMe('team-made/boilerplate-pro')
//     .then(info => {
//       res.send(info)
//     })
//     .catch(next)
// })
// router.get('/languages', (req, res, next) => {
//   getLanguages('team-made/boilerplate-pro')
//     .then(info => {
//       res.send(info)
//     })
//     .catch(next)
// })

router.post('/hyperClone', (req, res, next) => {
  console.log('hello!')
  console.log(req.body)
  const { repoName, githubUsername, githubToken, name, owner } = req.body
  const clone = new Cloner(repoName, githubUsername, githubToken, name, owner)
  res.status(200).send('OK')
})

router.get('/limit', (req, res, next) => {
  getRateLimit()
    .then(results => {
      res.json(results)
    })
    .catch(next)
})

router.get('/loadToStore', (req, res, next) => {
  searchParseCache([
    {
      term: 'boilerplate',
      sortBy: 'stars',
      orderBy: 'desc',
      pageLimit: 6
    },
    {
      term: 'starter kit',
      sortBy: '',
      orderBy: '',
      pageLimit: 6
    }
  ])
    .then(results => {
      console.log('FINAL RESULTS LENGTH', results.length)
      console.log(results[3])
    })
    .catch(err => console.log('ERROR :::', err))
  res.send('GATHERING')
})

module.exports = router
