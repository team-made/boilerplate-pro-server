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
  getAllReposInfo
} = require('./utils')

router.get('/getAllReposInfo', (req, res, next) => {
  getAllReposInfo([
    {
      full_name: 'team-made/boilerplate-pro',
      language: 'JavaScript'
    },
    {
      full_name: 'team-made/boilerplate-pro-server',
      language: 'JavaScript'
    }
  ])
    .then(response => res.json(response))
    .catch(next)
})

router.get('/getAdditionalRepoInfo', (req, res, next) => {
  getAdditionalRepoInfo({
    full_name: 'team-made/boilerplate-pro',
    language: 'JavaScript'
  })
    .then(response => res.json(response))
    .catch(next)
})

router.get('/json', (req, res, next) => {
  getPackageJSON('team-made/boilerplate-pro-server')
    .then(file => {
      res.json(file)
    })
    .catch(next)
})

router.get('/readme', (req, res, next) => {
  getReadMe('team-made/boilerplate-pro')
    .then(info => {
      res.send(info)
    })
    .catch(next)
})
router.get('/languages', (req, res, next) => {
  getLanguages('team-made/boilerplate-pro')
    .then(info => {
      res.send(info)
    })
    .catch(next)
})

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
  magicSearch([
    {
      term: 'boilerplate',
      sortBy: 'stars',
      orderBy: 'desc',
      pageLimit: 1
    }
  ])
    .then(results => {
      // send results to be saved here
      return results
    })
    .then(results => {
      console.log('FINAL RESULT LENGTH', results.length)
      console.log(results[3])
    })
    .catch(err => console.log('ERROR :::', err))
  res.send('GATHERING')
})

// router.get('/languagesForStoreItems', (req, res, next) => {
//   console.log('....beginning to fetch languages for repos')
//   res.send('in proccess...')
//   boilerplates
//     .get()
//     .then(snapshot => {
//       snapshot.forEach(doc => {
//         getLanguages(doc.data().full_name)
//           .then(languages => {
//             console.log('ID#', doc.id, '\t\tlanguages:', languages)
//             return boilerplates
//               .doc(doc.id)
//               .set({ languages: languages })
//               .then(_ => {
//                 console.log(doc.data().full_name, ' --> languages:', languages)
//               })
//           })
//           .catch(error => console.log(error))
//         console.log(doc.id, '\t\t', doc.data().full_name)
//       })
//     })
//     .catch(next)
// })

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
        res.send(`already cached today ${cacheDate}`)
      }
    })
    .catch(next)
})

module.exports = router
