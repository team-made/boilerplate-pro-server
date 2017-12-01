const lodash = require('lodash')
const chunk = lodash.chunk
const index = require('./index.js')

function sendToAlgolia(records) {
  const chunks = chunk(records, 500)
  console.log(
    `--> ALGOLIA: .... trying to store ${records.length} repos split into ${
      chunks.length
    } chunks`
  )
  chunks.map((batch, batchNumber) => {
    const smallBatch = batch.map(repo => {
      return lodash.pick(repo, [
        'objectID',
        'stargazers_count',
        'watchers_count',
        'forks_count',
        'id',
        'name',
        'full_name',
        'owner',
        'description',
        'language',
        'uses',
        'fork'
      ])
    })
    index.addObjects(smallBatch, (err, contents) => {
      if (err)
        console.log(
          `--> ALGOLIA (CHUNK ${batchNumber + 1} of ${
            chunks.length
          }): FAIL! we had an error: ${err}`
        )
      if (contents) {
        console.log(
          `--> ALGOLIA (CHUNK ${batchNumber + 1} of ${
            chunks.length
          }): SUCCESS! we have some contents: ${contents}`
        )
      }
    })
  })
}

module.exports = sendToAlgolia
