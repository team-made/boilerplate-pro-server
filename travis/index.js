const router = require('express').Router()
const axios = require('axios')
// const { getGitHub, search, getLanguages, getRateLimit } = require('./utils')
// const admin = require('firebase-admin')

router.post('/', (request, response, next) => {
  console.log('req:', request.body);
  const { token, username, repo } = request.body;
  const config = {
    headers: {
      Accept: 'application/vnd.travis-ci.2+json',
      'User-Agent': 'MyClient/1.0.0',
      Host: 'api.travis-ci.org',
      'Content-Type': 'application/json'
    }
  };
  axios
    .post(
      'https://api.travis-ci.org/auth/github',
      { github_token: token },
      config
    )
    .then(res => {
      console.log('Travis response token:', res.data.access_token);
      return res.data.access_token;
    })
    .then(async travisToken => {
      config.headers.Authorization = `token ${travisToken}`;
      console.log('auth', config);
      console.log('waiting for travis to sync');

      let travRepo;
      while (!travRepo) {
        travRepo = await axios.get(
          `https://api.travis-ci.org/repos/${username}/${repo}`,
          config
        );
      }

      const repoId = travRepo.data.repo.id;
      console.log('travRepo: ', travRepo, 'repoId: ', repoId);
      const data = { hook: { id: repoId, active: true } };
      if (travRepo) {
        await axios
          .put(`https://api.travis-ci.org/hooks`, data, config)
          .then(
            res => console.log(res.data) || response.status(200).send(res.data)
          )
          .catch(next);
      }
    });

  //ORIGINAL
  //  axios.get(
  //   `https://api.travis-ci.org/repos/${username}/${repo}`,
  //   config
  // )

  // .then(travRepo => {
  //   console.log('travRepo: ', travRepo)
  //   return travRepo.data.repo.id
  // })
  //   //.then(res => res.data.repo.id)
  //   .then(repoId => {
  //     const data = { hook: { id: repoId, active: true } };
  //     return axios.put(`https://api.travis-ci.org/hooks`, data, config);
  //   })
  //   .then(res => console.log(res.data) || response.status(200).send(res.data))
  //   .catch(next);
  // })
});

module.exports = router;

//   while (!correctRepo.data.repo) {
//     console.log('current get resolution: ', correctRepo)
//   }
//   console.log('correct repo: ');
//   return correctRepo.data.repo.id;
// })
