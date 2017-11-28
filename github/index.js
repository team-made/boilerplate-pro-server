const router = require('express').Router()
const axios = require('axios')
const Cloner = require('./localClone') // git locally
const { getRateLimit, getLanguages, gatherRepos } = require('./utils')

router.post('/hyperClone', (req, res, next) => {
  console.log('hello!')
  console.log(req.body)
  const { repoName, githubUsername, githubToken, name, owner } = req.body
  const clone = new Cloner(repoName, githubUsername, githubToken, name, owner)
  res.status(200).send('OK')
})

router.get('/limit', (req, res, next) => {
  getRateLimit()
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
      res.json(results)
    })
    .catch(next)
})

router.get('/loadToStore', (req, res, next) => {
  gatherRepos(5)
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
