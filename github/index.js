const router = require('express').Router()
const axios = require('axios')
const Cloner = require('./cloner')

router.post('/hyperClone', (req, res, next) => {})

// const { getGitHub, search, getLanguages, getRateLimit } = require('./utils')
// const admin = require('firebase-admin')

// // firebase setup
// var serviceAccount = require('../secrets.json')
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// })
// var db = admin.firestore()
// const caches = db.collection('caches')
// const boilerplates = db.collection('boilerplates')

// const date = new Date()
// const cacheDate =
//   date.getMonth() + 1 + '-' + date.getDate() + '-' + date.getFullYear()

// let interval

// // posts result batch to firestore
// // takes an array of repos from github
// function saveBatch(results) {
//   console.log('--> now attempting to store repos')
//   const batch = db.batch()
//   results.forEach(repo => {
//     const id = repo.id.toString()
//     batch.set(db.collection('boilerplates').doc(id), repo)
//   })
//   return batch.commit().then(data => {
//     console.log('-->', data.length, 'repos saved')
//   })
// }

// // gather creates get request for every page of search
// // takes a limit for the number of pages to gather
// // and send to save batch
// async function gather(limit) {
//   if (!limit) limit = 1
//   let pagePointer = 1
//   results = []

//   while (pagePointer <= limit) {
//     let result = await search(pagePointer)
//     result = result.items
//     console.log(
//       'Getting Page #',
//       pagePointer,
//       ' | repos found on page:',
//       result.length
//     )
//     results = results.concat(result)
//     pagePointer++
//   }
//   console.log('--------Total amount of results:', results.length)
//   saveBatch(results)
//   return results
// }

// router.get('/limit', (req, res, next) => {
//   getRateLimit().then(results => {
//     res.json(results)
//   })
// })

// router.get('/loadToStore', (req, res, next) => {
//   const items = gather(5)
//   console.log('items length', items.length)
//   res.json(items)
// })

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

// router.get('/', (req, res, next) => {
//   console.log('hit')
//   // res.send(cacheDate)
//   caches
//     .doc(cacheDate)
//     .get()
//     .then(doc => {
//       console.log('... checking if we ran the cache today')
//       if (!doc.exists) {
//         console.log('we have not run the cache today' + cacheDate)
//         return caches
//           .doc(cacheDate)
//           .set({ retrieved: true })
//           .then(_ => gather(3))
//           .then(stored => res.json(stored))
//           .catch(next)
//       } else {
//         console.log('already cached')
//         res.send(`already cached ${cacheDate}`)
//       }
//     })
//     .catch(next)
// })

// module.exports = router
