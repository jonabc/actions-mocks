const exec = require('@actions/exec');
const sinon = require('sinon');

const execMocks = JSON.parse(process.env.EXEC_MOCKS || '[]');
sinon.stub(exec, 'exec').callsFake((command, args, options) => {
  console.log(`args: ${JSON.stringify(args)}`);
  console.log(`options: ${JSON.stringify(options)}`);
  args = args || [];
  options = options || {};

  // log the full command and options to be verified by tests
  const optionsArray = Object.keys(options).map(key => `${key}:${options[key]}`);
  const fullCommand = [command, ...args, ...optionsArray].join(' ');
  console.log(fullCommand);

  // try to find a mock that matches the full command
  const mock = execMocks.find(mock => !!fullCommand.match(mock.command));

  // default to 1 (error) if mock is not found
  const exitCode = mock ? mock.exitCode : 1;

  // don't raise an error if the `ignoreReturnCode` option was specified
  if (exitCode !== 0 && !options.ignoreReturnCode) {
    return Promise.reject(exitCode);
  }

  return Promise.resolve(exitCode);
});
