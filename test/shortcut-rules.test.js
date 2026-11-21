import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canRemove,
  classify,
  launchesApp,
  looksLikeApp,
  normalizeArgs,
  normalizePath,
  plannedAction,
} from '../src/main/shortcut-rules.js';

const app = { target: 'C:\\Users\\r\\AppData\\Local\\Programs\\cv-studio\\CV Studio.exe', args: '' };
const dev = { target: 'C:\\cv\\node_modules\\electron\\dist\\electron.exe', args: '"C:\\cv"' };

describe('normalizePath', () => {
  it('ignores case, separators, quotes and trailing backslashes', () => {
    assert.equal(normalizePath('"C:/Program Files/App/"'), 'c:\\program files\\app');
    assert.equal(normalizePath('C:\\A\\..\\B\\app.exe'), 'c:\\b\\app.exe');
  });

  it('returns an empty string for empty values', () => {
    assert.equal(normalizePath(''), '');
    assert.equal(normalizePath(undefined), '');
    assert.equal(normalizePath('   '), '');
  });
});

describe('normalizeArgs', () => {
  it('keeps quoted arguments together and normalizes paths', () => {
    assert.equal(normalizeArgs(' "C:\\My Folder\\" --flag '), 'c:\\my folder --flag');
    assert.equal(normalizeArgs('  '), '');
  });
});

describe('launchesApp / looksLikeApp', () => {
  it('recognizes the same executable and arguments', () => {
    assert.ok(launchesApp({ target: app.target.toUpperCase() }, app));
    assert.ok(!launchesApp({ target: app.target, args: '--other' }, app));
    assert.ok(!launchesApp(null, app));
  });

  it('recognizes another copy of the app by its executable name', () => {
    assert.ok(looksLikeApp({ target: 'D:\\Old\\CV Studio.exe' }, app));
    assert.ok(!looksLikeApp({ target: 'C:\\Windows\\notepad.exe' }, app));
    assert.ok(!looksLikeApp({}, app));
  });
});

describe('classify', () => {
  const cases = [
    ['missing', { primary: null }, app],
    ['other-name', { primary: null, others: ['My CV.lnk'] }, app],
    ['ok', { primary: { target: app.target.toUpperCase().replace(/\\/g, '/') } }, app],
    ['outdated', { primary: { target: 'D:\\Old\\CV Studio.exe' } }, app],
    ['broken', { primary: { target: 'D:\\Old\\CV Studio.exe' }, primaryTargetExists: false }, app],
    ['foreign', { primary: { target: 'C:\\Windows\\notepad.exe' } }, app],
    ['foreign', { primary: { error: 'unreadable' } }, app],
    ['foreign', { primary: {} }, app],
    ['ok', { primary: { target: dev.target, args: ' "c:\\cv\\" ' } }, dev],
    ['outdated', { primary: { target: dev.target, args: '"C:\\other"' } }, dev],
  ];
  for (const [expected, found, target] of cases) {
    it(`${expected}: ${JSON.stringify(found)}`, () => {
      assert.equal(classify(found, target), expected);
    });
  }
});

describe('plannedAction / canRemove', () => {
  it('maps each status to an action', () => {
    const statuses = ['missing', 'outdated', 'broken', 'foreign', 'ok', 'other-name'];
    assert.deepEqual(statuses.map(plannedAction), ['create', 'repair', 'repair', 'replace', 'none', 'none']);
  });

  it('never removes a shortcut to another program', () => {
    assert.ok(!canRemove('foreign'));
    assert.ok(!canRemove('missing'));
    for (const status of ['ok', 'other-name', 'outdated', 'broken']) assert.ok(canRemove(status));
  });
});
