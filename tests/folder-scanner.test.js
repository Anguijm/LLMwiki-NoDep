import { describe, it, expect } from 'vitest';

// Covers the error-discrimination invariants of FolderScanner.listTierFilenames
// added for Phase 3 M3 per council rev 10 (bugs persona): a missing tier
// folder is a legitimate empty state; a permission-denied or stale-handle
// error must propagate so the caller's pre-commit scan fails loudly instead
// of silently returning an empty collision snapshot that would allow writes
// to proceed against stale data.

function mockDirHandleThatThrows(errName) {
  return {
    getDirectoryHandle: async function () {
      const err = new Error('mock error: ' + errName);
      err.name = errName;
      throw err;
    },
  };
}

function mockDirHandleWithFiles(filesByTier) {
  return {
    getDirectoryHandle: async function (tierName) {
      if (!(tierName in filesByTier)) {
        const err = new Error('not found');
        err.name = 'NotFoundError';
        throw err;
      }
      return {
        values: async function* () {
          for (const name of filesByTier[tierName]) {
            yield { kind: 'file', name: name };
          }
        },
      };
    },
  };
}

describe('FolderScanner.listTierFilenames — error discrimination', () => {
  it('swallows NotFoundError for missing tier folders and returns an empty list for that tier', async () => {
    const mock = mockDirHandleThatThrows('NotFoundError');
    const result = await FolderScanner.listTierFilenames(mock);
    expect(result).toEqual({ bedrock: [], warm: [], cold: [] });
  });

  it('propagates NotAllowedError (permission denied) so callers fail loudly', async () => {
    const mock = mockDirHandleThatThrows('NotAllowedError');
    await expect(FolderScanner.listTierFilenames(mock)).rejects.toThrow();
  });

  it('propagates InvalidStateError (stale/revoked handle) so callers fail loudly', async () => {
    const mock = mockDirHandleThatThrows('InvalidStateError');
    await expect(FolderScanner.listTierFilenames(mock)).rejects.toThrow();
  });

  it('enumerates .md files in populated tier folders', async () => {
    const mock = mockDirHandleWithFiles({
      warm: ['foo.md', 'bar.md', '.hidden.tmp', 'readme.txt'],
      bedrock: ['core.md'],
      // cold omitted → NotFoundError → empty list
    });
    const result = await FolderScanner.listTierFilenames(mock);
    expect(result.warm).toEqual(['foo.md', 'bar.md']); // hidden .tmp + non-.md filtered out
    expect(result.bedrock).toEqual(['core.md']);
    expect(result.cold).toEqual([]);
  });
});
