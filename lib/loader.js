const fs = require('fs');
const path = require('path');

// load mock files and add mocks as given in process environment
const mocksDir = path.join(__dirname, 'mocks');
const availableMocks = fs.readdirSync(mocksDir).map(file => path.join(mocksDir, file));
for (mockFile of availableMocks) {
  const { mock } = require(mockFile);
  const mocksToAdd = process.env[`${path.basename(mockFile, '.js').toUpperCase()}_MOCKS`];
  if (mocksToAdd) {
    mock(JSON.parse(mocksToAdd));
  }
}

process.argv.slice(2).forEach(file => {
  require(file);
});
