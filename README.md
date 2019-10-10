# actions-mocks
Mocking helpers for testing GitHub Actions

## Usage

The exported package contains the following GitHub Actions testing utilities.
```javascript
{
  // used to end-to-end test an action script
  run: [AsyncFunction: run],

  // used to unit test an action
  mocks: {
    exec: {
      mock: [Function: mock],
      clear: [Function: clear],
      restore: [Function: restore],
      setLog: [Function: setLog]
    },
    github: {
      mock: [Function: mock],
      clear: [Function: clear],
      restore: [Function: restore],
      setLog: [Function: setLog]
    }
  }
}
```

### End to end testing

Use the exported method, `run(action, { mocks, env })`
- `action` (required) is the full path to the action script to run
- `mocks` (optional) configurations for mocking `@actions` modules
- `env` (optional) environment to set on action process

All mock classes are enabled by default to provide a safe environment to run actions locally.  Mock classes can be configured by setting `mocks.<actions toolkit package name> = [<mock expectations>]`. All mock expectations MUST be serializable using `JSON.stringify`.

```javascript
mocks.exec = [{ command: 'git commit', exitCode: 1 }]
mocks.github = [{ method: 'GET', uri: '/issues', code: 200 }]
```

`run` returns an object `{ out, err, status }`.
- `out`: the full log of output written to `stdout`
- `err`: the full log of output written to `stderr`
- `status`: the exit code of the action

See the [tests](./test/runner.test.js) for more examples.

### Unit testing

This package can be used for unit testing with the imported `mocks` object.

Each `mocks` sub-object supports the following API:

`mock` - Add one or more mock(s).  Accepts either a single mock configuration and an array of mock configurations.
   - defaults to `JSON.parse(process.env.<MOCK NAME>_MOCKS || '[]')`
`setLog` - Set the method used to log commands and API calls during testing
   - defaults to `console.log`
`clear` - Clears all currently configured mocks
`restore` - Resets configured mocks and the logging method back to their defaults.

```javascript
const { mocks } = require('actions-mocks');
const myLib = require('../lib/myLib');
const os = require('os');

// myLib.gitAdd calls `git add`
let output = '';
mocks.exec.setLog(log => output += log + os.EOL);
mocks.exec.mock({ command: 'git add', stdout: 'git output', exitCode: 10 });

const { exitCode, commandStdout } = await myLib.gitAdd('arg');
expect(exitCode).toEqual(10);
expect(commandStdout).toMatch('git output');
expect(output).toMatch('git add');

// myLib.listIssues calls `octokit.issues.list()`
output = '';
mocks.github.setLog(log => output += log + os.EOL);
mocks.github.mock({ method: 'GET', uri: '/issues', response: '[]', code: 200 });

const { data, status } = await myLib.listIssues();
expect(status).toEqual(200);
expect(data).toEqual([]);
expect(output).toMatch('GET /issues');
```

See the [exec](./test/mocks/exec.test.js) and [github](./test/mocks/github.test.js) unit tests for more examples.

## Mocking `@actions/exec`

The `@actions/exec` mock catches all calls to `@actions/exec.exec` and
1. log the full command and it's execution options to the specified logging method (default: `console.log`)
   - calls are logged as `<full command with args> <key>:<value> <key>:<value>` where key/value pairs are from the `options` object passed to `@actions/exec.exec`
2. output provided `stdout` using the passed in options
3. output provided `stderr` using the passed in options
4. return an exit code
   - if the command doesn't match a configured mock, returns 127
   - if the command matches a configured mock, returns the configured `exitCode` or 0 if not set

The mocked call returns a promise that is resolved for a 0 exit code and rejected for all other exit codes.  Calls to `@actions/exec.exec` that specify `options: { ignoreReturnCode: true }` will never be rejected.

```javascript
// with a resolved mocked command
const exitCode = await exec.exec(...);

// with a rejected mocked command
await exec.exec(...).catch(exitCode => { });

// with a rejected mocked command using ignoreReturnCode
const exitCode = await exec.exec(..., {  ignoreReturnCode: true });
```

To configure the mock behavior, pass an array of objects with the following format:
```javascript
{
  // (required) pattern of command to match.
  // Uses String.prototype.match to perform regex evaluation
  command: '',
  // (optional) data to output to stdout on matching exec call
  stdout: '',
  // (optional) data to output to stderr on matching exec call
  stderr: '',
  // (optional) exit code to return, defaults to 0
  exitCode: 0,
  // (optional) number of times the mock should be used.  defaults to a persistent mock if not set
  count: 1
}
```

Command patterns are prioritized based on their location in the passed in array.  In the following example, `git commit` will return an exit code of 1 while all other commands will return an exit code of 0.

```javascript
{ command: 'git commit', exitCode: 1 },
{ command: '', exitCode: 0 }
```

## Mocking `@actions/github`

The `@actions/github` mock uses `nock` to catch all calls to `https://api.github.com` and
1. log all API requests to the specified logging method (default: `console.log`)
   - calls are logged as `<METHOD> <path?query> <request body>`
2. returns a response
   1. status
      - calls that don't match any configured mocks will return a `404`
      - calls that match a configured mock will return `code`, or `200` if not set
   2. data
      - response data can be specified when configuring a mock using the `response` property
      - response data can be loaded from a fixture by using the `responseFixture` property

```javascript
// with a successful (2xx) mocked API call
const { data } = await octokit.user.repos(...);

// with a failed (4xx-5xx) mocked API call
await octokit.user.repos(...).catch(({data}) => { });
```

To configure the mock behavior, pass an array of objects with the following format:
```javascript
{
  // (required) the request method to match
  method: 'GET',
  // (required) uri pattern to match.  should not include the domain (https://api.github.com)
  // Uses String.prototype.match to perform regex evaluation
  uri: '/user/repos',
  // (optional) http code to set on the response, default: 200
  code: 200,
  // (DEPRECATED) Please use `code` to specify a response http code
  // (optional) http code to set on the response, default: 200
  responseCode: 200,
  // (optional) response to send, given as a string
  response: '[]',
  // (optional) path to load response contents from
  file: 'path/to/file',
  // (DEPRECATED) Please use `file` to load response contents from a file, along with headers `content-type` = `application/json`
  // (optional) response to send, given as a path to a JSON fixture to load
  responseFixture: '',
  // (optional) headers to set on the mocked response
  headers: {},
  // (optional) number of times the mock should be used.  defaults to a persistent mock if not set
  count: 1
}
```

Command patterns are prioritized based on their location in the passed in array.

```javascript
// `GET /user/repos` will return a 400
{ method: 'GET', uri: '/user/repos', code: 400 },
// all other `GET` commands will return 500
{ method: 'GET', uri: '', code: 500 }
```
