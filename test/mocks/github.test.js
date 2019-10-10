// default state of mocks when module is loaded
process.env.GITHUB_MOCKS = JSON.stringify([
  { method: 'GET', uri: '', code: 200 }
])

const github = require('@actions/github');
const mocks = require('../../lib/mocks/github');
const sinon = require('sinon');
const path = require('path');

const octokit = new github.GitHub('token');

let outString;

afterEach(() => {
  mocks.restore();
});

it('uses the first found mock', async () => {
  mocks.setLog(() => {});
  mocks.mock([
    { method: 'GET', uri: '', code: 400 },
    { method: 'GET', uri: '', code: 500 }
  ]);

  await expect(octokit.issues.list()).rejects.toHaveProperty('status', 400);
});

it('logs the mocked request', async () => {
  outString = '';
  mocks.setLog(data => outString += data);

  await octokit.issues.list();
  expect(outString).toMatch('GET /issues');
});

it('returns a rejected promise if the response code is not successful', async () => {
  mocks.setLog(() => {});
  mocks.mock({ method: 'GET', uri: '', code: 404 });
  await expect(octokit.issues.list()).rejects.toHaveProperty('status', 404);
});

it('includes process.env.GITHUB_MOCKS on load', async () => {
  mocks.setLog(() => {});
  const { status } = await octokit.issues.list();
  expect(status).toEqual(200);
});

it('returns 404 if a route isn\'t mocked', async () => {
  mocks.setLog(() => {});
  mocks.clear();
  await expect(octokit.issues.list()).rejects.toHaveProperty('status', 404);
});

describe('mock', () => {
  beforeEach(() => {
    outString = '';
    mocks.setLog(data => outString += data);
  });

  it('prepends a command to be mocked', async () => {
    mocks.mock({ method: 'GET', uri: '/issues', code: 202 });
    const { status } = await octokit.issues.list();
    expect(status).toEqual(202);
  });

  it('prepends an array of commands to be mocked', async () => {
    mocks.mock([
      { method: 'GET', uri: '/issues', code: 201 },
      { method: 'GET', uri: '/users', code: 202 }
    ]);
    let { status } = await octokit.issues.list();
    expect(status).toEqual(201);

    status = (await octokit.users.list()).status;
    expect(status).toEqual(202);
  });

  it('sends a mock string response', async () => {
    mocks.mock({ method: 'GET', uri: '', response: 'response' });

    const { data } = await octokit.issues.list();
    expect(data).toMatch('response');
  });

  it('sends a mock response loaded from a fixture', async () => {
    const fixture = path.normalize(path.join(__dirname, '..', 'fixtures', 'repos.json'));
    mocks.mock({ method: 'GET', uri: '', responseFixture: fixture });

    const { data } = await octokit.issues.list();
    expect(data).toEqual(require(fixture));
  });

  it('sends a mock response loaded from a file', async () => {
    const fixture = path.normalize(path.join(__dirname, '..', 'fixtures', 'repos.json'));
    mocks.mock({ method: 'GET', uri: '', file: fixture });

    const { data } = await octokit.issues.list();
    // note that because the content-type header wasn't mocked,
    // the data is returned as a string
    expect(JSON.parse(data)).toEqual(require(fixture));
  });

  it('sends headers with the mock response', async () => {
    const fixture = path.normalize(path.join(__dirname, '..', 'fixtures', 'repos.json'));
    mocks.mock({ method: 'GET', uri: '', file: fixture, headers: { 'content-type': 'application/json' } });

    const { data, headers } = await octokit.issues.list();
    expect(headers).toEqual({ 'content-type': 'application/json' });

    // with the proper content type set, this is returned as a json object
    expect(data).toEqual(require(fixture));
  });

  it('sets a count of times the mock should trigger', async () => {
    mocks.mock([
      { method: 'GET', uri: '', code: 201, count: 1 },
      { method: 'GET', uri: '', code: 202 }
    ]);

    let { status } = await octokit.issues.list();
    expect(status).toEqual(201);

    status = (await octokit.issues.list()).status;
    expect(status).toEqual(202);
  });
});

describe('clear', () => {
  beforeEach(() => {
    mocks.setLog(() => {});
  });

  it('clears the known mocks', async () => {
    mocks.mock({ method: 'GET', uri: '', code: 200 });
    mocks.clear();

    await expect(octokit.issues.list()).rejects.toHaveProperty('status', 404);
  });
});

describe('restore', () => {
  beforeEach(() => {
    outString = '';
    sinon.stub(console, 'log').callsFake(data => outString += data);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('resets mocks and settings to their initial states', async () => {
    let fakeLog = '';
    const fake = sinon.fake(log => fakeLog += log);

    mocks.mock({ method: 'GET', uri: '', code: 400 });
    mocks.setLog(fake);
    mocks.restore();

    const { status } = await octokit.issues.list();
    expect(status).not.toEqual(400);
    expect(fakeLog).toEqual('');
    expect(fake.callCount).toEqual(0);
    expect(outString).toMatch('GET /issues');
  });
});

describe('setLog', () => {
  let fake;
  beforeEach(() => {
    fake = sinon.fake(log => outString += log);
    mocks.setLog(fake);
  });

  it('sets the method used to log output', async () => {
    await octokit.issues.list();
    expect(outString).toMatch('GET /issues');
    expect(fake.callCount).toEqual(1);
  });
});
