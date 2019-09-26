const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const stream = require('stream');

const mocksDir = path.join(__dirname, 'lib', 'mocks');
const nodeArgs = [];
async function loadMocks() {
  if (nodeArgs.length == 0) {
    nodeArgs.push(
      // always run the loader first
      path.join(__dirname, 'lib', 'loader'),
      ...(await fs.readdir(mocksDir)).map(file => path.join(mocksDir, file))
    );
  }
}

async function runAction(actionScript, options) {
  options = options || {}

  const execOptions = { ...options };
  execOptions.env = {
    ...process.env, // send process.env to action under test
    ...execOptions.env // any passed in env overwrites process.env
  };

  if (options.mocks) {
    // send mocks configs to the child process
    // mocks keys should match actions toolkit package names, i.e. `exec` or `github`
    for(let key in options.mocks) {
      // send the mock options to the child process through ENV
      execOptions.env[`${key.toUpperCase()}_MOCKS`] = JSON.stringify(options.mocks[key]);
    }
  }

  let outString = '';
  let errString = '';
  execOptions.ignoreReturnCode = true;
  execOptions.listeners = {
    stdout: data => outString += data.toString() + os.EOL,
    stderr: data => errString += data.toString() + os.EOL
  };
  execOptions.outStream = new stream.Writable({ write: data => outString += data + os.EOL });
  execOptions.errStream = new stream.Writable({ write: data => errString += data + os.EOL });


  await loadMocks();
  const exitCode = await exec('node', [...nodeArgs, action], execOptions);
  return { out: outString, err: errString, status: exitCode };
}

module.exports = {
  runAction
}
