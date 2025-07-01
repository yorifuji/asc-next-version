'use strict';

const GitHubAction = require('./interfaces/actions/githubAction');

/**
 * Main entry point
 */
async function main() {
  const action = new GitHubAction();
  await action.run();
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
