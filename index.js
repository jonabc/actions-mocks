const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const stream = require('stream');

async function runAction(actionScript, options) {
  options = options || {}

  // always run the loader first
  const nodeArgs = [
    path.join(__dirname, 'lib', 'loader')
  ];

  const execOptions = { ...options };
  execOptions.env = {
    ...process.env, // send process.env to action under test
    ...execOptions.env // any passed in env overwrites process.env
  };

  if (options.mocks) {
    // try to find a mock file for each requested mocks property
    // keys should match actions toolkit package names, i.e. `exec` or `github`
    for(let key in options.mocks) {
      const mockPath = path.join(__dirname, 'lib', 'mocks', `${key}.js`);
      if (await fs.access(mockPath).then(() => true).catch(() => false)) {
        // load the mock
        nodeArgs.push(mockPath);
        // send the mock options to the child process through ENV
        execOptions.env[`${key.toUpperCase()}_MOCKS`] = JSON.stringify(options.mocks[key]);
      }
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

  nodeArgs.push(actionScript);

  const exitCode = await exec('node', nodeArgs, execOptions);
  return { out: outString, err: errString, status: exitCode };
}

module.exports = {
  runAction
}
