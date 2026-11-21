import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { slugify, suggestTag, validateCvTag } from '../src/shared/github-tags.js';

describe('slugify', () => {
  it('removes accents and punctuation', () => {
    assert.equal(slugify('Développeur web — Alternance'), 'developpeur-web-alternance');
  });

  it('falls back when nothing is left', () => {
    assert.equal(slugify('—'), 'cv');
    assert.equal(slugify('', 'file'), 'file');
  });

  it('is limited to 60 characters without a trailing dash', () => {
    const slug = slugify('a'.repeat(59) + ' bcd');
    assert.ok(slug.length <= 60);
    assert.ok(!slug.endsWith('-'));
  });
});

describe('suggestTag', () => {
  it('builds cv-<name>-v1', () => {
    assert.deepEqual(suggestTag('Développeur web — Alternance'), {
      tag: 'cv-developpeur-web-alternance-v1',
      number: 1,
    });
  });

  it('does not repeat the cv- prefix', () => {
    assert.equal(suggestTag('CV Développeur').tag, 'cv-developpeur-v1');
    assert.equal(suggestTag('CV').tag, 'cv-cv-v1');
  });

  it('skips tags already taken', () => {
    assert.equal(suggestTag('X', ['cv-x-v1', 'cv-x-v2']).tag, 'cv-x-v3');
  });
});

describe('validateCvTag', () => {
  it('accepts CV tags', () => {
    assert.equal(validateCvTag('cv-dev-v1'), null);
    assert.equal(validateCvTag('cv-a.b_c-v2'), null);
  });

  it('rejects app versions and invalid git refs', () => {
    for (const tag of ['v0.2.0', 'cv/a', 'cv-a b', 'cv-a..b', 'cv-a.lock', 'cv-a.', '']) {
      assert.equal(typeof validateCvTag(tag), 'string', tag);
    }
  });
});
