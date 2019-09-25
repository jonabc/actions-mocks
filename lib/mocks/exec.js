const exec = require('@actions/exec');
const sinon = require('sinon');

const execMocks = JSON.parse(process.env.EXEC_MOCKS || '[]');
sinon.stub(exec, 'exec').callsFake((command, args, options) => {
  console.log(`args: ${JSON.stringify(args)}`);
  console.log(`options: ${JSON.stringify(options)}`);
  args = args || [];
  options = options || {};

  const optionsArray = Object.keys(options).map(key => `${key}:${options[key]}`);
  const fullCommand = [command, ...args, ...optionsArray].join(' ');
  console.log(fullCommand);

  const mock = execMocks.find(mock => !!fullCommand.match(mock.command));
  const exitCode = mock ? mock.exitCode : 1;
  if (exitCode !== 0 && !options.ignoreReturnCode) {
    return Promise.reject(exitCode);
  }

  return Promise.resolve(exitCode);
});
