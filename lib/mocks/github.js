const nock = require('nock');

const apiMocks = JSON.parse(process.env.GITHUB_MOCKS || '[]');
function responseFunction(uri, requestBody) {
  // log the request to match against in tests
  console.log(`${this.req.method} ${uri} : ${JSON.stringify(requestBody)}`);

  const mock = apiMocks.find(mock => mock.method == this.req.method && uri.match(mock.uri));
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
  }

  return [responseCode, response];
}

// gatekeep this thing - don't let any requests get through
nock('https://api.github.com')
  .persist()
  .get(/.*/).reply(responseFunction)
  .put(/.*/).reply(responseFunction)
  .post(/.*/).reply(responseFunction)
  .patch(/.*/).reply(responseFunction)
  .delete(/.*/).reply(responseFunction);
