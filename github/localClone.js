const Promise = require('bluebird')
const axios = require('axios')
const fs = require('fs-extra')
const git = require('simple-git/promise')

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
    this.originGitURL = `https://github.com/${this.sourceUser}/${
      this.sourceRepo
    }.git`
    this.originURL = `https://github.com/${this.sourceUser}/${this.sourceRepo}`
    this.destinationAuth = `https://${this.userToken}@github.com/${
      this.destinationUser
    }/${this.destinationRepo}`
    this.requestHeaders = {
      headers: {
        Authorization: `token ${this.userToken}`,
        'User-Agent': 'BoilerPlatePro'
      }
    }

    this.cloneLocal()
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

  newRepoObj() {
    return {
      name: this.destinationRepo,
      description: `Your new repo created by https://BoilerPlate.Pro. (using ${
        this.originURL
      } as your boilerplate )`,
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true
    }
  }

  createRepo() {
    const GIT_PATH = `user/repos`
    return this.postGit(GIT_PATH, this.newRepoObj()).catch(err =>
      console.log(`error with creating repo`)
    )
  }

  cloneLocal() {
    const localPath = `./tmp/${this.destinationUser}`

    if (!fs.pathExistsSync(`${localPath}/${this.destinationRepo}`)) {
      // we do not have this repo created on our server yet...
      this.createRepo()
        .then(newRepo => {
          console.log(
            `SUCCESS! created new repo ${this.destinationRepo} on github for ${
              this.destinationUser
            }`
          )
          return fs.ensureDir(localPath)
        })
        .then(_ => {
          console.log(`SUCCESS! created dir: ${localPath} `)
          return git(`${localPath}`)
            .silent(true)
            .clone(this.destinationAuth)
        })
        .then(_ => {
          console.log('SUCCESS! now adding remote for source boilerplate')
          return git(`${localPath}/${this.destinationRepo}`).addRemote(
            'BoilerPlateSource',
            this.originGitURL
          )
        })
        .then(_ => {
          console.log('SUCCESS! now pulling from new source')
          return git(`${localPath}/${this.destinationRepo}`).pull(
            'BoilerPlateSource',
            'master',
            { '--rebase': 'true' }
          )
        })
        .then(_ => {
          console.log('SUCCESS! now adding all files pulled to new commit')
          return git(`${localPath}/${this.destinationRepo}`).add('./*')
        })
        .then(_ => {
          console.log('SUCCESS! now committing changes')
          return git(`${localPath}/${this.destinationRepo}`).commit(
            'INITIAL - BOILERPLATE.PRO COMMIT!'
          )
        })
        .then(_ => {
          console.log('SUCCESS! now pushing changes')
          return git(`${localPath}/${this.destinationRepo}`).push(
            'origin',
            'master'
          )
        })
        .catch(err => console.error('FAIL!! FAIL!! FAIL!!: ', err))
        .then(_ => {
          console.log('-- -- -- -- -- COMPLETE -- -- -- -- -- ')
        })
    } else {
      // if we do have the repo stored locally on our server already...
      console.log('REPO FOLDER ALREADY EXISTS... now trying to remove it')
      fs
        .remove(`${localPath}/${this.destinationRepo}`)
        .then(() => {
          console.log('successfully removed old repo folder!')
          this.cloneLocal()
        })
        .catch(err => {
          console.error(err)
        })
    }
  }
}

module.exports = Cloner
