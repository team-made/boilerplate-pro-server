const lodash = require('lodash')
const chunk = lodash.chunk
const index = require('./index.js')

function sendToAlgolia(records) {
  const chunks = chunk(records, 1000)
  console.log(
    `--> ALGOLIA: .... trying to store ${records.length} repos split into ${
      chunks.length
    } chunks`
  )
  chunks.map((batch, batchNumber) =>
    index.addObjects(batch, (err, contents) => {
      if (err)
        console.log(
          `--> ALGOLIA (CHUNK ${batchNumber}): FAIL! we had an error: ${err}`
        )
      if (contents) {
        console.log(
          `--> ALGOLIA (CHUNK ${
            batchNumber
          }): SUCCESS! we have some contents: ${contents}`
        )
      }
    })
  )
}

module.exports = sendToAlgolia
