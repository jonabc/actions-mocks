const run = require('../lib/runner');
const path = require('path');

describe('run', () => {
  it('mocks exec calls in an action', async () => {
    const action = path.join(__dirname, 'fixtures', 'exec-action');
    const mocks = {
      exec: [
        { command: 'test-fail', exitCode: 1 },
        { command: 'test-succeed', exitCode: 0 },
        { command: 'test-not-ignored', exitCode: 3 }
      ]
    };
    const { out, err, status } = await run(action, { mocks });
    expect(status).toEqual(0);
    expect(out).toMatch('test-fail fail-arg');
    expect(out).toMatch('test-fail exited with status 1');

    expect(out).toMatch('test-succeed succeed-arg');
    expect(out).toMatch('test-succeed exited with status 0');

    expect(out).toMatch('test-not-mocked');
    expect(out).toMatch('test-not-mocked exited with status 1');

    expect(out).toMatch('test-not-ignored');
    expect(out).toMatch('test-not-ignored caught with status Error: Failed with exit code 3');
  });


  it('mocks github API calls in an action', async () => {
    const action = path.join(__dirname, 'fixtures', 'github-action');
    const reposFixture = path.join(__dirname, 'fixtures', 'repos');
    const mocks = {
      github: [
        // can load response from fixtures
        { method: 'GET', uri: '/user/repos', responseFixture: reposFixture },
        // can set response code and direct response text
        { method: 'PATCH', uri: '/orgs/test', responseCode: 500, response: "Server error"}
      ]
    };

    const { out, err, status } = await run(action, { mocks });
    expect(status).toEqual(0);
    // verify response body is sent
    expect(out).toMatch('GET /user/repos');
    expect(out).toMatch(`repos list status: 200, response: ${JSON.stringify(require(reposFixture))}`);

    // verify request body is captured
    expect(out).toMatch('PATCH /orgs/test : {"company":"company"}');
    expect(out).toMatch('org update status: 500');

    // verify unmatched routes are 404-d
    expect(out).toMatch('GET /organizations');
    expect(out).toMatch('organizations list status: 404');
  });

  it('passes environment to the action', async () => {
    process.env.FROM_ENV = "from env";
    const action = path.join(__dirname, 'fixtures', 'env-action');
    const env = { FROM_ARGS: "from args" };
    const { out, err, status } = await run(action, { env });
    expect(status).toEqual(0);
    expect(out).toMatch("\"FROM_ENV\":\"from env\"");
    expect(out).toMatch("\"FROM_ARGS\":\"from args\"");
  });

  it('doesn\'t error if the action fails', async () => {
    const action = path.join(__dirname, 'fixtures', 'fail-action');
    const { out, err, status } = await run(action);
    expect(status).toEqual(1);
    expect(err).toMatch('run error');
  });

  it('doesn\'t error if the action throws an error', async () => {
    const action = path.join(__dirname, 'fixtures', 'error-action');
    const { out, err, status } = await run(action);
    expect(status).toEqual(1);
    expect(err).toMatch('Error: run error');
  });
});
