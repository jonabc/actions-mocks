const github = require('@actions/github');
const octokit = new github.GitHub('token');

async function run() {
  const {status, data} = await octokit.repos.list();
  console.log(`repos list status: ${status}, response: ${JSON.stringify(data)}`)

  await octokit.orgs.update({ org: "test", company: "company" }).catch(({status}) => {
    console.log(`org update status: ${status}`);
  });

  await octokit.orgs.list().catch(({status}) => {
    console.log(`organizations list status: ${status}`);
  });
}

run();
