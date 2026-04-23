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

// Mock FileSystemDirectoryHandle that tracks in-memory file contents and lets
// tests inject write-truncation behavior per file. Used to exercise
// _atomicWrite's post-write verification without touching a real filesystem.
function mockAtomicWriteDirHandle(options) {
  options = options || {};
  var files = {}; // name → string content
  var writeCounts = {}; // name → number of write calls so far (for per-attempt truncation)
  var truncateWritesFor = options.truncateWritesFor || {}; // name → function(attempt, content) → content-to-store
  var removedEntries = [];

  function getFileHandle(name /* , opts */) {
    return Promise.resolve({
      createWritable: async function () {
        var buf = '';
        return {
          write: async function (data) {
            buf += data;
          },
          close: async function () {
            writeCounts[name] = (writeCounts[name] || 0) + 1;
            var truncator = truncateWritesFor[name];
            if (typeof truncator === 'function') {
              files[name] = truncator(writeCounts[name], buf);
            } else {
              files[name] = buf;
            }
          },
          abort: async function () {},
        };
      },
      getFile: async function () {
        if (!(name in files)) {
          var err = new Error('not found');
          err.name = 'NotFoundError';
          throw err;
        }
        var stored = files[name];
        return {
          text: async function () {
            return stored;
          },
          lastModified: Date.now(),
        };
      },
    });
  }

  return {
    _files: files,
    _writeCounts: writeCounts,
    _removed: removedEntries,
    getFileHandle: getFileHandle,
    removeEntry: async function (name) {
      removedEntries.push(name);
      delete files[name];
    },
  };
}

describe('FolderScanner._atomicWrite — post-write verification', () => {
  it('writes, verifies, and cleans up temp on happy path', async () => {
    var dir = mockAtomicWriteDirHandle();
    var content = 'hello world'.repeat(10);
    await FolderScanner._atomicWrite(dir, 'note.md', content);
    expect(dir._files['note.md']).toBe(content);
    expect(dir._removed).toContain('.note.md.tmp');
  });

  it('detects partial-write corruption and restores from in-memory content', async () => {
    var content = 'x'.repeat(1000);
    // First write to note.md truncates; second write (restore) is clean.
    var dir = mockAtomicWriteDirHandle({
      truncateWritesFor: {
        'note.md': function (attempt, buf) {
          if (attempt === 1) return buf.substring(0, 500); // partial
          return buf; // restore attempt writes correctly
        },
      },
    });
    await FolderScanner._atomicWrite(dir, 'note.md', content);
    expect(dir._files['note.md']).toBe(content); // restored
    expect(dir._removed).toContain('.note.md.tmp'); // only cleaned after restore verify passes
  });

  it('throws and preserves .tmp when corruption persists after restore attempt', async () => {
    var content = 'x'.repeat(1000);
    var dir = mockAtomicWriteDirHandle({
      truncateWritesFor: {
        'note.md': function (/* attempt, buf */) {
          return 'x'.repeat(500); // always truncated, restore can't fix
        },
      },
    });
    await expect(FolderScanner._atomicWrite(dir, 'note.md', content)).rejects.toThrow(
      /length still mismatched|length mismatch/
    );
    expect(dir._removed).not.toContain('.note.md.tmp'); // .tmp preserved for manual recovery
    // Temp file still holds the correct content (it was written clean in step 1).
    expect(dir._files['.note.md.tmp']).toBe(content);
  });
});

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
