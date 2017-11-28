const fs = require('fs')
const SECRETS_PATH = 'gitsecrets.json'

let cred

if (fs.existsSync(SECRETS_PATH)) {
  cred = require(`../${SECRETS_PATH}`)
} else {
  cred = {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
  }
}

module.exports = cred
