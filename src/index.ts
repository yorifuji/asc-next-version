import { GitHubAction as AppStoreVersionAction } from './interfaces/actions/githubAction.js';

/**
 * Main entry point for the GitHub Action
 * Executes the App Store version determination workflow
 */
async function executeAction(): Promise<void> {
  const action = new AppStoreVersionAction();
  await action.execute();
}

/**
 * Error handler for uncaught exceptions
 */
function handleUnexpectedError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('========================================');
  console.error('UNEXPECTED ERROR');
  console.error('========================================');
  console.error(`Error: ${errorMessage}`);

  if (errorStack) {
    console.error('\nStack trace:');
    console.error(errorStack);
  }

  console.error('========================================');
  process.exit(1);
}

// Execute the action when this module is run directly
// Using require.main check for CJS compatibility
if (require.main === module) {
  executeAction().catch(handleUnexpectedError);
}

// Export for programmatic usage
export { executeAction };
export type { AppStoreVersionAction } from './interfaces/actions/githubAction.js';
