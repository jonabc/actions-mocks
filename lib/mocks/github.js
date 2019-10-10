const fs = require('fs');
const nock = require('nock');

const mocks = [];
let logMethod = console.log;

function responseFunction(uri, requestBody) {
  // log the request to match against in tests
  logMethod(`${this.req.method} ${uri} : ${JSON.stringify(requestBody)}`);

  const mock = mocks.find(mock => mock.method == this.req.method && uri.match(mock.uri));
  if (!mock) {
    // if the route wasn't mocked, return 404
    return [404, 'Route not mocked'];
  }

  const responseCode = mock.responseCode || 200;
  let response = '';
  if (mock.response) {
    response = mock.response;
  } else if (mock.responseFixture) {
    response = require(mock.responseFixture);
  } else if (mock.file) {
    response = fs.createReadStream(mock.file);
  }

  if (mock.count > 0) {
    mock.count -= 1;
    if (mock.count === 0) {
      const index = mocks.indexOf(mock);
      mocks.splice(index, 1);
    }
  }

  const headers = mock.headers || {};
  return [responseCode, response, headers];
}

// gatekeep this thing - don't let any requests get through
nock('https://api.github.com')
  .persist()
  .get(/.*/).reply(responseFunction)
  .put(/.*/).reply(responseFunction)
  .post(/.*/).reply(responseFunction)
  .patch(/.*/).reply(responseFunction)
  .delete(/.*/).reply(responseFunction);

function mock(mocksToAdd) {
  if (Array.isArray(mocksToAdd)) {
    mocks.unshift(...mocksToAdd)
  } else {
    mocks.unshift(mocksToAdd);
  }
}

function clear() {
  mocks.length = 0;
}

function restore() {
  clear();
  setLog(console.log);

  // by default, add all mocks from the process environment
  mock(JSON.parse(process.env.GITHUB_MOCKS || '[]'));
}

function setLog(method) {
  logMethod = method;
}

restore();

module.exports = {
  mock,
  clear,
  restore,
  setLog
};
