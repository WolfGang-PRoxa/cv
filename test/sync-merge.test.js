import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planSync } from '../src/shared/sync-merge.js';

describe('planSync', () => {
  it('does nothing when both sides match', () => {
    assert.deepEqual(planSync({ local: { a: '1' }, remote: { a: '1' }, synced: { a: '0' } }), {});
    assert.deepEqual(planSync({}), {});
  });

  it('plans each three-way case', () => {
    const plan = planSync({
      local: { mine: 'b2', theirs: 'c', both: 'd2', newHere: 'e', delThere: 'g', modDel: 'h2' },
      remote: { mine: 'b', theirs: 'c2', both: 'd3', newThere: 'f', delHere: 'x', delMod: 'i2' },
      synced: { mine: 'b', theirs: 'c', both: 'd', delHere: 'x', delThere: 'g', modDel: 'h', delMod: 'i' },
    });
    assert.deepEqual(plan, {
      mine: 'push',
      theirs: 'pull',
      both: 'conflict',
      newHere: 'push',
      newThere: 'pull',
      delHere: 'delete-remote',
      delThere: 'delete-local',
      modDel: 'push',
      delMod: 'pull',
    });
  });

  it('lets the remote version replace an untouched sample base', () => {
    assert.equal(planSync({ local: { base: 'sample' }, remote: { base: 'real' }, pristine: ['base'] }).base, 'pull');
  });

  it('keeps an untouched local item when the remote one is missing', () => {
    assert.equal(planSync({ local: { base: 'sample' }, remote: {}, pristine: ['base'] }).base, 'push');
  });

  it('reports two different bases on the first sync as a conflict', () => {
    assert.equal(planSync({ local: { base: 'mine' }, remote: { base: 'real' } }).base, 'conflict');
  });
});
