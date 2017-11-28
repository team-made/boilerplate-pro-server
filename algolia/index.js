const algoliasearch = require('algoliasearch')

const fs = require('fs')
const SECRETS_PATH = 'algoliasecrets.json'
let cred

if (fs.existsSync(SECRETS_PATH)) {
  cred = require(`../${SECRETS_PATH}`)
} else {
  cred = {
    ALGOLIA_ID: process.env.ALGOLIA_ID,
    ALGOLIA_KEY: process.env.ALGOLIA_KEY
  }
}

const client = algoliasearch(cred.ALGOLIA_ID, cred.ALGOLIA_KEY)
const index = client.initIndex('boilerplates')

module.exports = index
