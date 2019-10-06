const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const stream = require('stream');

const mocksDir = path.join(__dirname, 'mocks');
const nodeArgs = [];
async function loadMocks() {
  if (nodeArgs.length == 0) {
    nodeArgs.push(
      // always run the loader first
      path.join(__dirname, 'loader.js'),
      ...(await fs.readdir(mocksDir)).map(file => path.join(mocksDir, file))
    );
  }
}

async function run(action, { mocks = {}, env = {} } = {}) {
  const options = {
    env: {
      ...process.env, // send process.env to action under test
      ...env // any passed in env overwrites process.env
    }
  };

  if (mocks) {
    // send mocks configs to the child process
    // mocks keys should match actions toolkit package names, i.e. `exec` or `github`
    for(let key in mocks) {
      // send the mock options to the child process through ENV
      options.env[`${key.toUpperCase()}_MOCKS`] = JSON.stringify(mocks[key]);
    }
  }

  let outString = '';
  let errString = '';
  options.ignoreReturnCode = true;
  options.listeners = {
    stdout: data => outString += data.toString() + os.EOL,
    stderr: data => errString += data.toString() + os.EOL
  };
  options.outStream = new stream.Writable({ write: data => outString += data + os.EOL });
  options.errStream = new stream.Writable({ write: data => errString += data + os.EOL });

  await loadMocks();
  const exitCode = await exec('node', [...nodeArgs, action], options);
  return { out: outString, err: errString, status: exitCode };
}

module.exports = run;
