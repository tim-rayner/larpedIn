import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSatireTemplates, SATIRE_TEMPLATES } from '../src/satire-templates.js';

test('ten distinct satire structures are available', () => {
  assert.equal(SATIRE_TEMPLATES.length,10);
  assert.equal(new Set(SATIRE_TEMPLATES.map(template=>template.id)).size,10);
  assert.ok(SATIRE_TEMPLATES.every(template=>template.name&&template.structure));
});

test('a page receives non-repeating templates selected before generation', () => {
  const selected=chooseSatireTemplates(10,()=>0.42);
  assert.equal(selected.length,10);
  assert.equal(new Set(selected.map(template=>template.id)).size,10);
  assert.deepEqual(chooseSatireTemplates(3,()=>0).map(template=>template.id),['executive-memo','unpopular-opinion','three-lessons']);
});
