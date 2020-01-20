// default state of mocks when module is loaded
process.env.EXEC_MOCKS = JSON.stringify([
  { command: '', exitCode: 0 }
])

const exec = require('@actions/exec');
const mocks = require('../../lib/mocks/exec');
const sinon = require('sinon');
const stream = require('stream');
const os = require('os');

let outString;

afterEach(() => {
  mocks.restore();
});

it('uses the first found mock', async () => {
  mocks.setLog(() => {});
  mocks.mock([
    { command: '', exitCode: 2 },
    { command: '', exitCode: 3 }
  ]);

  const exitCode = await exec.exec('command', [], { ignoreReturnCode: true });
  expect(exitCode).toEqual(2);
});

it('logs the mocked command', async () => {
  outString = '';
  mocks.setLog(data => outString += data);

  await exec.exec('command', ['test', 'args']);
  expect(outString).toMatch('command test args');
});

it('returns a rejected promise if ignoreReturnCode is not set with an error exit code', async () => {
  mocks.setLog(() => {});
  mocks.mock({ command: 'command', exitCode: 2 });
  await expect(exec.exec('command', ['test'])).rejects.toThrow(
    'Failed with exit code 2'
  );
});

it('includes process.env.EXEC_MOCKS on load', async () => {
  mocks.setLog(() => {});
  const exitCode = await exec.exec('command', ['test'], { ignoreReturnCode: true });
  expect(exitCode).toEqual(0);
});

it('returns a failure exit code if a command isn\'t mocked', async () => {
  mocks.setLog(() => {});
  mocks.clear();
  await expect(exec.exec('command', ['test'])).rejects.toThrow(
    'Failed with exit code 127'
  );
});

describe('mock', () => {
  beforeEach(() => {
    outString = '';
    mocks.setLog(data => outString += data);
  });

  it('prepends a command to be mocked', async () => {
    mocks.mock({ command: 'command', exitCode: 0 });
    const exitCode = await exec.exec('command', ['test']);
    expect(exitCode).toEqual(0);
  });

  it('prepends an array of commands to be mocked', async () => {
    mocks.mock([
        { command: 'command1', exitCode: 0 },
        { command: 'command2', exitCode: 10 }
    ]);
    let exitCode = await exec.exec('command1', ['test']);
    expect(exitCode).toEqual(0);

    exitCode = await exec.exec('command2', [], { ignoreReturnCode: true });
    expect(exitCode).toEqual(10);
  });

  it('writes mock stdout', async () => {
    const options = {
      listeners: {
        stdout: data => outString += data.toString()
      },
      outStream: new stream.Writable({ write: data => outString += data })
    };

    mocks.mock({ command: 'command', stdout: 'test out', exitCode: 0 });

    await exec.exec('command', ['test'], options);
    expect(outString).toMatch('test out');
  });

  it('writes mock stderr', async () => {
    const options = {
      listeners: {
        stderr: data => outString += data.toString()
      },
      // prevent non stderr output from being logged
      outStream: new stream.Writable({ write: () => {}}),
      errStream: new stream.Writable({ write: data => outString += data })
    };

    // prevent non stderr output from being logged
    mocks.setLog(() => {});
    mocks.mock({ command: 'command', stderr: 'test out', exitCode: 0 });

    await exec.exec('command', ['test'], options);
    expect(outString).toMatch('test out');
  });

  it('sets a count of times the mock should trigger', async () => {
    mocks.mock([
      { command: 'command', exitCode: 1, count: 1},
      { command: 'command', exitCode: 2 }
    ]);

    let exitCode = await exec.exec('command', [], { ignoreReturnCode: true });
    expect(exitCode).toEqual(1);

    exitCode = await exec.exec('command', [], { ignoreReturnCode: true });
    expect(exitCode).toEqual(2);
  });
});

describe('clear', () => {
  beforeEach(() => {
    mocks.setLog(() => {});
  });

  it('clears the known mocks', async () => {
    mocks.mock({ command: '', exitCode: 0 });
    mocks.clear();

    const exitCode = await exec.exec('command', [], { ignoreReturnCode: true });
    expect(exitCode).not.toEqual(0);
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

    mocks.mock({ command: '', exitCode: 1 });
    mocks.setLog(fake);
    mocks.restore();

    const exitCode = await exec.exec('command');
    expect(exitCode).not.toEqual(1);
    expect(fakeLog).toEqual('');
    expect(fake.callCount).toEqual(0);
    expect(outString).toMatch('command');
  });
});

describe('setLog', () => {
  let fake;
  beforeEach(() => {
    fake = sinon.fake(log => outString += log);
    mocks.setLog(fake);
  });

  it('sets the method used to log output', async () => {
    await exec.exec('command');
    expect(outString).toMatch('command');
    expect(fake.callCount).toEqual(1);
  });
});
