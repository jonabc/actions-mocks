const { exec } = require('@actions/exec');

async function run() {
  let exitCode = await exec('test-fail', ['fail-arg'], { ignoreReturnCode: true });
  console.log(`test-fail exited with status ${exitCode}`);

  exitCode = await exec('test-succeed', ['succeed-arg'], { ignoreReturnCode: true });
  console.log(`test-succeed exited with status ${exitCode}`);

  exitCode = await exec('test-not-mocked', [], { ignoreReturnCode: true });
  console.log(`test-not-mocked exited with status ${exitCode}`);

  await exec('test-not-ignored').catch(exitCode => {
    console.log(`test-not-ignored caught with status ${exitCode}`)
  });
}

run();
