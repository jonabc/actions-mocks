module.exports = {
  run: require('./lib/runner'),
  mocks: {
    exec: require('./lib/mocks/exec'),
    github: require('./lib/mocks/github')
  }
};
