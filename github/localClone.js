const Promise = require('bluebird')
const axios = require('axios')
const fs = require('fs-extra')
const git = require('simple-git/promise')

// seearch variables for firestore
const { db } = require('../firebase-auth')
const users = db.collection('users')

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
    this.FULL_NAME = 'BOILER PLATE PRO'
    this.FULL_EMAIL = 'BOILERPLATEGODS@BOILERPLATE.PRO'
    this.destinationRepo = destRepo
    this.destinationUser = destUser
    this.userToken = userToken
    this.sourceRepo = sourceRepo

    // for firestore
    this.userID
    this.repoID

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
    return axios.get(URI).then(res => res.data)
  }

  postGit(path, data) {
    const URI = `${this.gitHubAPI}/${path}?access_token=${this.userToken}`
    console.log(`inside of postGit --> ${URI}`)
    return axios.post(URI, data, this.requestHeaders).then(res => res.data)
  }

  putGit(path, data) {
    const URI = `${this.gitHubAPI}/${path}?access_token=${this.userToken}`
    console.log(`inside of putGit --> ${URI} `)
    return axios.put(URI, data, this.requestHeaders).then(res => res.data)
  }

  newRepoObj() {
    return {
      name: this.destinationRepo,
      description: `Your new repo created by https://Boilerplate.Pro. (You are using ${
        this.originURL
      } as your boilerplate)`,
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true
    }
  }

  createRepo() {
    const GIT_PATH = `user/repos`
    return this.postGit(GIT_PATH, this.newRepoObj())
  }

  cloneLocal() {
    const localPath = `./tmp/${this.destinationUser}`

    if (!fs.pathExistsSync(`${localPath}/${this.destinationRepo}`)) {
      // we do not have this repo created on our server yet...
      this.createRepo()
        .then(repo => {
          this.repoID = repo.id
          console.log(
            `SUCCESS! created new repo ${this.destinationRepo} on github for ${
              this.destinationUser
            }`
          )
          return users.where('githubUsername', '==', this.destinationUser).get()
        })
        .then(snapshot => {
          console.log(
            `... finding ${this.destinationUser} by githubUsername in firestore`
          )
          snapshot.forEach(doc => {
            console.log('========= ON ====== ', doc.id)
            this.userID = doc.id
          })
          console.log('this.userID', this.userID)
          console.log('this.repoID', this.repoID)
          const today = new Date()
          return db
            .collection('users')
            .doc(this.userID.toString())
            .collection('repos')
            .doc(this.destinationRepo)
            .set(
              {
                name: this.destinationRepo,
                gitHubRepoID: this.repoID,
                original: `${this.sourceUser}/${this.sourceRepo}`,
                created: today,
                status: 'Repository created on github.com'
              },
              { merge: true }
            )
        })
        .then(_ => {
          return fs.ensureDir(localPath)
        })
        .then(_ => {
          console.log(`SUCCESS! created dir: ${localPath} `)
          return git(`${localPath}`)
            .silent(true)
            .clone(this.destinationAuth)
        })
        .then(_ => {
          console.log(`SUCCESS! now adding user name`)
          return git(`${localPath}/${this.destinationRepo}`).addConfig(
            'user.name',
            this.FULL_NAME
          )
        })
        .then(_ => {
          console.log(`SUCCESS! now adding user email`)
          return git(`${localPath}/${this.destinationRepo}`).addConfig(
            'user.email',
            this.FULL_EMAIL
          )
        })
        .then(_ => {
          console.log('SUCCESS! now adding remote for source boilerplate')
          return git(`${localPath}/${this.destinationRepo}`).addRemote(
            'BoilerPlateSource',
            this.originGitURL
          )
        })
        .then(_ => {
          return db
            .collection('users')
            .doc(this.userID.toString())
            .collection('repos')
            .doc(this.destinationRepo)
            .update({
              status: `Pulling ${this.sourceRepo}`
            })
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
          return fs.outputJson(`${localPath}/${this.destinationRepo}/app.json`, {name: this.destinationRepo, description: 'Built with Boilerplate Pro'})
        })
        .then(_ => {
          console.log('SUCCESS! now adding all files pulled to new commit')
          return git(`${localPath}/${this.destinationRepo}`).add('./*')
        })
        .then(_ => {
          console.log('SUCCESS! now committing changes')
          return git(`${localPath}/${this.destinationRepo}`).commit(
            'INITIAL - BOILERPLATE.PRO'
          )
        })
        .then(_ => {
          console.log('SUCCESS! now pushing changes')
          return git(`${localPath}/${this.destinationRepo}`).push(
            'origin',
            'master'
          )
        })
        .then(_ => {
          return db
            .collection('users')
            .doc(this.userID.toString())
            .collection('repos')
            .doc(this.destinationRepo)
            .update({
              status: `Pushing ${this.destinationRepo} to your github account`
            })
        })
        .then(_ => {
          console.log(
            `--> trying to remove ( ${localPath}/${
              this.destinationRepo
            } ) from our server`
          )
          return fs.remove(`${localPath}/${this.destinationRepo}`)
        })
        .then(() => {
          console.log(
            `--> successfully removed ( ${localPath}/${this.destinationRepo} )!`
          )
          console.log('-- -- -- -- -- COMPLETE -- -- -- -- -- ')
          return null
        })
        .then(_ => {
          return db
            .collection('users')
            .doc(this.userID.toString())
            .collection('repos')
            .doc(this.destinationRepo)
            .update({ status: `DONE` })
        })
        .then(_ => {
          // for future counting of repo installs
          // return db
          //   .collection('install-count')
          //   .doc(this.sourceUser + '/' + this.sourceRepo)
          return null
        })
        .catch(err => {
          console.error('-> FINAL FAIL!! : ', err)
          return db
            .collection('users')
            .doc(this.userID.toString())
            .collection('repos')
            .doc(this.destinationRepo)
            .update({ status: `FAILURE` })
            .catch(err => console.log('FAILING TO FAIL to firestore', err))
        })
    } else {
      // if we do have the repo stored locally on our server already...
      console.log('REPO FOLDER ALREADY EXISTS... now trying to remove it')
      fs
        .remove(`${localPath}/${this.destinationRepo}`)
        .then(() => {
          console.log(
            'successfully removed old repo folder! Restarting clone process.'
          )
          this.cloneLocal()
        })
        .catch(err => {
          console.error(err)
        })
    }
  }
}

//const dummyAppJSON = JSON.stringify()


// export const appJSONFileCreator = function () {
//   let contentObj = {
//     message: 'f(appJSON):testing github app file creation',
//     committer: {
//       name: 'Mitchell Stewart',
//       email: 'mitchellwstewart@gmail.com'
//     },
//     content: `${window.btoa(dummyAppJSON)}`
//   }
//   return contentObj
// }




module.exports = Cloner
