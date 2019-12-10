const exec = require('@actions/exec');
const os = require('os');
const sinon = require('sinon').createSandbox();

const mocks = [];
let logMethod = console.log;

function getOutputString(value) {
  if (!value) {
    return null;
  } else if (Array.isArray(value)) {
    return value.map(arg => JSON.stringify(arg)).join(os.EOL);
  } else {
    return JSON.stringify(value);
  }
}

async function mockFunction(command, args = [], options = {}) {
  logMethod('mock function!');
  const optionsArray = Object.keys(options || {}).map(key => `${key}:${JSON.stringify(options[key])}`);
  const fullCommand = [command, ...args, ...optionsArray].join(' ');
  logMethod(fullCommand);

  let exitCode = 127;

  const mock = mocks.find(mock => !!fullCommand.match(mock.command));
  if (mock) {
    const stdout = getOutputString(mock.stdout);
    if (stdout) {
      // write to stdout using the passed in options
      await exec.exec.wrappedMethod('node', ['-e', `process.stdout.write(${stdout})`], options);
    }

    const stderr = getOutputString(mock.stderr);
    if (stderr) {
      // write to stderr using the passed in options
      await exec.exec.wrappedMethod('node', ['-e', `process.stderr.write(${stderr})`], options);
    }

    if (mock.callOriginal) {
      const throughOptions = { ...options, ignoreReturnCode: true };
      exitCode = await exec.exec.wrappedMethod(command, args, throughOptions);
    } else {
      exitCode = mock.exitCode || 0;
    }

    if (mock.count > 0) {
      mock.count -= 1;
      if (mock.count === 0) {
        const index = mocks.indexOf(mock);
        mocks.splice(index, 1);
      }
    }
  }

  if (exitCode !== 0 && !options.ignoreReturnCode) {
    return Promise.reject(exitCode);
  }

  return Promise.resolve(exitCode);
}

function mock(mocksToAdd) {
  if (Array.isArray(mocksToAdd)) {
    mocks.unshift(...mocksToAdd)
  } else {
    mocks.unshift(mocksToAdd);
  }

  if (!exec.exec.wrappedMethod) {
    sinon.stub(exec, 'exec').callsFake(mockFunction);
  }
}

function clear() {
  mocks.length = 0;
}

function restore() {
  clear();
  setLog(console.log);
  sinon.restore();
}

function setLog(method) {
  logMethod = method;
}

module.exports = {
  mock,
  clear,
  restore,
  setLog
};
