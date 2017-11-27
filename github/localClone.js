const gits = require('gits')
const axios = require('axios')
const path = require('path')

var cloneURL = 'https://github.com/nodegit/test'
var localPath = require('path').join(__dirname, 'tmp')

class Cloner {
  constructor(destRepo, destUser, userToken, sourceRepo, sourceUser) {
    if (!destRepo) {
      throw new Error('CLONER: missing destination repo name')
    }
    if (!destUser) {
      throw new Error('CLONER: missing destination user')
    }
    if (!userToken) {
      throw new Error('CLONER: missing user token')
    }
    if (!sourceRepo) {
      throw new Error('CLONER: missing source repo name')
    }
    if (!sourceUser) {
      throw new Error('CLONER: missing source repo user')
    }
    this.gitHubAPI = 'https://api.github.com'
    this.status = 'initializing'
    this.destinationRepo = destRepo
    this.destinationUser = destUser
    this.userToken = userToken
    this.sourceRepo = sourceRepo
    this.counter = 0
    this.sourceUser = sourceUser
    this.cloneURL = `https://github.com/${this.sourceUser}/${this.sourceRepo}`
    this.requestHeaders = {
      headers: {
        Authorization: `token ${this.userToken}`,
        'User-Agent': 'BoilerPlatePro'
      }
    }
  }
  getGit(path) {
    const URI = `${this.gitHubAPI}/${path}?access_token=${this.userToken}`
    console.log(`inside of getGit --> ${URI}`)
    return axios
      .get(URI)
      .then(res => res.data)
      .catch(err => console.error('ERROR GET GIT:', err))
  }

  postGit(path, data) {
    const URI = `${this.gitHubAPI}/${path}?access_token=${this.userToken}`
    console.log(`inside of postGit --> ${URI}`)
    return axios
      .post(URI, data, this.requestHeaders)
      .then(res => res.data)
      .catch(err => console.error('ERROR POST GIT:', err))
  }

  putGit(path, data) {
    const URI = `${this.gitHubAPI}/${path}?access_token=${this.userToken}`
    console.log(`inside of putGit --> ${URI} `)
    return axios
      .put(URI, data, this.requestHeaders)
      .then(res => res.data)
      .catch(err => console.error('ERROR PUT GIT:', err))
  }

  createRepo() {
    const path = `user/repos`
    return this.postGit(path, this.newRepoObj()).catch(err =>
      console.log(`error with creating repo`)
    )
  }

  // cloneLocally() {
  //   const errorAndAttemptOpen = function() {
  //     return NodeGit.Repository.open(local)
  //   }

  //   const cloneOptions = {}

  //   const localPath = require('path').join(
  //     __dirname,
  //     'tmp',
  //     this.sourceUser,
  //     this.sourceRepo
  //   )
  //   const cloneRepository = NodeGit.Clone(
  //     this.cloneURL,
  //     localPath,
  //     cloneOptions
  //   )
  //   cloneRepository.catch(errorAndAttemptOpen).then(function(repository) {
  //     // Access any repository methods here.
  //     console.log('should be cloned')
  //     console.log('Is the repository bare? %s', Boolean(repository.isBare()))
  //   })
  // }

  cloneLocal() {}
}

module.exports = Cloner
