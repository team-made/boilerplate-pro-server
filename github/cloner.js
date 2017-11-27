const axios = require('axios')
var crypto = require('crypto')
class GHCloner {
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
    this.requestHeaders = {
      headers: {
        Authorization: `token ${this.userToken}`,
        'User-Agent': 'BoilerPlatePro'
      }
    }
    console.log(
      `cloner initialized: [Dest Repo] ${this.destinationRepo} [Dest User] ${
        this.destinationUser
      } [User Token] ${this.userToken} [Sour Repo] ${
        this.sourceRepo
      } [Sour User] ${this.sourceUser}`
    )
    this.status = 'initialized'
    this.start()
  }

  start() {
    return this.createRepo()
      .then(newRepo => {
        console.log('repo made:', newRepo)
        // this.cloneFile({ name: 'yarn.lock', path: 'yarn.lock' })
        this.cloneDirectory('')
      })
      .catch(err => console.log(`error in start up`))
  }

  async getSHA(data) {
    return await crypto
      .createHash('sha')
      .update(data)
      .digest('hex')
  }

  newRepoObj() {
    return {
      name: this.destinationRepo,
      description: 'Your new repo created by https://BoilerPlate.Pro.',
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true
    }
  }

  makeCommitWithData(file) {
    console.log('commitWithData:', file.content, 'on path', file.path)
    // path: file.path,
    // sha: file.sha,
    return {
      message: `Initialized Repository (${this.counter})`,
      committer: {
        name: 'BoilerPlate.Pro',
        email: 'DoNotEmail@BoilerPlate.Pro'
      },
      content: `${this.base64Encode(file.content)}`
    }
  }

  base64Decode(encodedString) {
    const b = new Buffer(encodedString, 'base64')
    return b.toString()
  }

  base64Encode(decodedString) {
    const b = new Buffer(decodedString)
    return b.toString('base64')
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

  // returns directory and file list of source repo
  getContents(path) {
    const basePath = `repos/${this.sourceUser}/${this.sourceRepo}/contents/${
      path
    }`
    return this.getGit(basePath).catch(err =>
      console.log(`error with reading path`)
    )
  }

  // reads contents of an individual file from the source repo
  readFileContents(file) {
    const basePath = `repos/${this.sourceUser}/${this.sourceRepo}/contents/${
      file.path
    }`
    return this.getGit(basePath).catch(err =>
      console.log(`error with reading file`)
    )
  }

  // writes new file contents to destination repo
  writeFileContents(file) {
    const commitWithData = this.makeCommitWithData(file)
    const basePath = `repos/${this.destinationUser}/${
      this.destinationRepo
    }/contents/${file.path}`
    return this.putGit(basePath, commitWithData)
      .then(newFile => {
        console.log('created file: ', file.name)
        return newFile
      })
      .catch(err => console.log(`error with writing file`))
  }

  // reads contents from source repo and saves file to dest repo
  cloneFile(file) {
    try {
      const originalFile = this.readFileContents(file)
      originalFile.then(file => {
        setTimeout(this.writeFileContents(file), 3000)
      })
    } catch (err) {
      console.log(`error in readAndWriteFile: ${err}`)
    }
  }

  cloneDirectory(path) {
    console.log('on path', path)
    try {
      this.getContents(path).then(files => {
        for (var i = 0; i < files.length; i++) {
          const file = files[i]
          console.log('--> ', file.name, '(', file.path, ')', '-', file.type)
          if (file.type === 'file') {
            const clonedFile = this.cloneFile.bind(this, file)
            setTimeout(clonedFile, 12000)
          } else if (file.type === 'dir') {
            // console.log('=========DIR========= ', file.name)
            this.cloneDirectory(file.path)
          }
        }
      })
    } catch (err) {
      console.log(`error in cloneFile: ${err}`)
    }
  }
}

module.exports = GHCloner
