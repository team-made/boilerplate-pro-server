const lodash = require('lodash')
const chunk = lodash.chunk
const index = require('./index.js')

function sendToAlgolia(records) {
  records.forEach(record => {
    record.objectID = record.id
  })
  console.log(`--> ALGOLIA: trying to store ${records.length} repos`)
  const chunks = chunk(records, 1000)
  chunks.map(batch =>
    index.addObjects(batch, (err, contents) => {
      if (err) console.log(`--> ALGOLIA: FAIL! we had an error: ${err}`)
      if (contents) {
        console.log(`--> ALGOLIA: SUCCESS! we have some contents: ${contents}`)
      }
    })
  )
}

module.exports = sendToAlgolia
