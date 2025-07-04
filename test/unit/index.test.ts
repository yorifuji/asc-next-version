import { describe, expect, test, vi } from 'vitest';
import { executeAction } from '../../src/index.js';

// Mock the GitHubAction
vi.mock('../../src/interfaces/actions/githubAction.js', () => ({
  GitHubAction: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue(undefined),
  })),
  AppStoreVersionAction: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('index', () => {
  test('executeAction creates and runs GitHubAction', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const { GitHubAction } = await import('../../src/interfaces/actions/githubAction.js');

    vi.mocked(GitHubAction).mockImplementation(
      () =>
        ({
          execute: mockExecute,
        }) as any,
    );

    await executeAction();

    expect(GitHubAction).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
