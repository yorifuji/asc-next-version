import { GitHubAction } from './interfaces/actions/githubAction.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const action = new GitHubAction();
  await action.run();
}

// Direct execution for GitHub Actions
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

export { main };
