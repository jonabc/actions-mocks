# actions-mocks
Mocking helpers to use when end-to-end testing GitHub Actions

## Usage

There is one exported method, `run(action, { mocks, env })`
- `action` (required) is the full path to the action script to run
- `mocks` (optional) configurations for mocking `@actions` modules
- `env` (optional) environment to set on action process

All mocks are enabled by default to provide a safe environment to run actions locally.  They can be configured by setting `mocks.<actions toolkit package name> = [<mock expectations>]`. All mock expectations MUST be serializable using `JSON.stringify`.

e.g. `mocks.exec = [{ command: 'git commit', exitCode: 1 }]`

`run` returns an object `{ out, err, status }`.
- `out`: the full log of output written to `stdout`
- `err`: the full log of output written to `stderr`
- `status`: the exit code of the action

The majority of the content in the

See the [tests](./test/index.test.js) for more examples.

### Mocking `@actions/exec`

The `@actions/exec` mock catches all calls to `@actions/exec.exec`, logs the full command and it's execution options to `stdout`, and returns an exit code.  Any calls that don't match any configuration entries from `mocks.exec` will return 127 by default.

Calls are logged as `<full command with args> <key>:<value> <key>:<value>` where key/value pairs are from the `options` object passed to `@actions/exec.exec`.

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
  command: ''
  // (optional) exit code to return, defaults to 127
  exitCode: 0
}
```

Command patterns are prioritized based on their location in the passed in array.  In the following example, `git commit` will return an exit code of 1 while all other commands will return an exit code of 0.

```javascript
{ command: 'git commit', exitCode: 1 },
{ command: '', exitCode: 0 }
```

### Mocking `@actions/github`

The `@actions/github` mock uses `nock` to catch all calls to `https://api.github.com`.  The mock logs all API requests to `stdout` and returns a response.  Any API calls that don't match any configuration entries from `mocks.github` will return a `404` code by default.

Calls are logged as `<method (uppercase)> <path?query> <request body>`.

By default, any API calls using an octokit/rest.js instance return from `new @actions/github.GitHub` that doesn't match specified configuration will return a 404 response.

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
  // (required) http code to set on the response
  responseCode: 200,
  // (optional) response to send, given as a string
  response: '[]'
  // (optional) response to send, given as a path to a JSON fixture to load
  responseFixture: ''
}
```

Command patterns are prioritized based on their location in the passed in array.  In the following example, `GET /user/repos` will return a 400 while all other `GET` commands will return 500.

```javascript
{ method: 'GET', uri: '/user/repos', responseCode: 400 },
{ method: 'GET', uri: '', responseCode: 500 }
```
