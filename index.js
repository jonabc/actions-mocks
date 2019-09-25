const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const stream = require('stream');

async function runAction(actionScript, options) {
  const nodeArgs = [
    path.join(__dirname, 'lib', 'loader')
  ];

  const execOptions = { ...options };
  execOptions.env = {
    ...process.env,
    ...execOptions.env
  };

  if (options.mocks) {
    for(let key in options.mocks) {
      const mockPath = path.join(__dirname, 'lib', 'mocks', `${key}.js`);
      if (await fs.access(mockPath).then(() => true).catch(() => false)) {
        nodeArgs.push(mockPath);
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
