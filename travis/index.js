const router = require('express').Router()
const axios = require('axios')
// const { getGitHub, search, getLanguages, getRateLimit } = require('./utils')
// const admin = require('firebase-admin')

router.post('/', (request, response, next) => {
  //console.log('req:', request.body);
  let travisRepo;
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
    .then(travisToken => {
      config.headers.Authorization = `token ${travisToken}`;
      console.log('auth', config);
      console.log('waiting for travis to sync');
      let travisCheck = setInterval(() => {
        axios.get(`https://api.travis-ci.org/repos/${username}`, config)
        //CHECKING ALL TRAVIS REPOS (5 sec intervals) TO SEE IF NEW REPO HAS BEEN SYNCED YET 
          .then(res => {
            travisRepo = res.data.repos.find(travRepo => {
              console.log('repoName: ',repo,'slice: ', travRepo.slug.split('/')[1]);
              return repo === travRepo.slug.split('/')[1];
            }); //Sets 'travisRepo' variable to new repo (to confirm that travis synced)
            if (travisRepo) {
              clearInterval(travisCheck);
              console.log('Repo Synced: ', travisRepo);
              axios.get( //ONLY MAKE THIS CALL WHEN REPO EXISTS
                  `https://api.travis-ci.org/repos/${username}/${repo}`,
                  config
                )
                // .then(travRepo => {
                //   return travRepo.data.repo.id;
                // })
                .then(travRepo => { 
                  const data = { hook: { id: travRepo.data.repo.id, active: true } };
                  return axios.put(`https://api.travis-ci.org/hooks`,data,config);
                  //Makes put request to travis for engage/active hook
                })
                .then(res => console.log(res.data) || response.status(200).send(res.data)
                )
                .catch(next);
            }
          })
        
      }, 5000);
    });
});

module.exports = router;
