import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildReleaseNotes, extractSection } from '../scripts/changelog-notes.mjs';

const changelog = `# Changelog

## [Unreleased]

### Added

- Something new.

## [1.2.0] - 2026-11-20

### Added

- Feature A.

### Fixed

- Bug B.

## [1.1.0] - 2026-10-01

### Added

- Feature C.

[1.2.0]: https://github.com/example/repo/releases/tag/v1.2.0
[1.1.0]: https://github.com/example/repo/releases/tag/v1.1.0
`;

describe('extractSection', () => {
  it('returns the section up to the next version heading', () => {
    assert.equal(extractSection(changelog, '1.2.0'), '### Added\n\n- Feature A.\n\n### Fixed\n\n- Bug B.');
  });

  it('returns null when the section is missing', () => {
    assert.equal(extractSection(changelog, '9.9.9'), null);
    assert.equal(extractSection(changelog, 'Unreleased'), null);
  });

  it('reads the last section of the file without the link definitions', () => {
    assert.equal(extractSection(changelog, '1.1.0'), '### Added\n\n- Feature C.');
  });

  it('accepts Windows line endings', () => {
    assert.equal(extractSection(changelog.replace(/\n/g, '\r\n'), '1.1.0'), '### Added\n\n- Feature C.');
  });

  it('does not treat dots in the version as wildcards', () => {
    assert.equal(extractSection(changelog, '1x2x0'), null);
  });

  it('returns an empty string for an empty section', () => {
    assert.equal(extractSection('## [2.0.0] - 2026-12-01\n\n## [1.0.0] - 2026-01-01\n\n- A.\n', '2.0.0'), '');
  });
});

describe('buildReleaseNotes', () => {
  const withChangelogs = (english, french, callback) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-notes-'));
    try {
      fs.writeFileSync(path.join(root, 'CHANGELOG.md'), english);
      fs.writeFileSync(path.join(root, 'CHANGELOG.fr.md'), french);
      callback(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };

  it('puts the English notes first, then the French ones', () => {
    const french = '## [1.1.0] - 2026-10-01\n\n### Ajouts\n\n- Fonction C.\n';
    withChangelogs(changelog, french, (root) => {
      assert.equal(
        buildReleaseNotes('1.1.0', { root }),
        '### Added\n\n- Feature C.\n\n---\n\n### Français\n\n### Ajouts\n\n- Fonction C.\n',
      );
    });
  });

  it('fails when the section is missing from one of the files', () => {
    withChangelogs(changelog, '## [Unreleased]\n\n- Fonction.\n', (root) => {
      assert.throws(() => buildReleaseNotes('1.2.0', { root }), /CHANGELOG\.fr\.md.*absente/);
    });
  });

  it('fails when the section is empty', () => {
    withChangelogs(changelog, '## [1.2.0] - 2026-11-20\n\n## [1.1.0] - 2026-10-01\n\n- A.\n', (root) => {
      assert.throws(() => buildReleaseNotes('1.2.0', { root }), /CHANGELOG\.fr\.md.*vide/);
    });
  });

  it('fails with a precise message when the date is missing', () => {
    withChangelogs(changelog, '## [1.2.0]\n\n- Fonction.\n', (root) => {
      assert.throws(() => buildReleaseNotes('1.2.0', { root }), /doit être/);
    });
  });
});
