// simple loader to include mocks in a subprocess before running the app
process.argv.slice(2).forEach(file => {
  require(file);
});
