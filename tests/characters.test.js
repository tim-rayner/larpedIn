import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTERS, PUBLIC_CHARACTERS, browserCharactersModule,
  characterForCompany, characterForNewsStory, currentUser,
} from '../src/characters.js';

test('Scam Altman is the current fictional user', () => {
  assert.equal(currentUser.name, 'Scam Altman');
  assert.equal(currentUser.company, 'ClosedAI');
});

test('news metadata maps to the appropriate fictional CEO', () => {
  assert.equal(characterForNewsStory({title:'A story',categories:['OpenAI'],url:'one'}).characterId, 'scam-altman');
  assert.equal(characterForNewsStory({title:'New GPU launch',categories:['Hardware'],url:'two'}).characterId, 'jensen-hype');
  assert.equal(characterForNewsStory({title:'Robotaxi update',categories:['Transportation'],url:'three'}).characterId, 'elong-husk');
  assert.notEqual(characterForNewsStory({title:'A metadata startup',categories:['Databases'],url:'four'}).characterId, 'mark-zuckerbot');
});

test('real companies route to fictional characters without entering public data', () => {
  assert.equal(characterForCompany('OpenAI Group PBC').characterId, 'scam-altman');
  assert.equal(characterForCompany('NVIDIA Corporation').characterId, 'jensen-hype');
  assert.equal(characterForCompany('Alphabet, Inc.').characterId, 'sundar-pitchai');
  assert.equal(characterForCompany('unknown'), undefined);
  for (const character of Object.values(PUBLIC_CHARACTERS)) {
    assert.equal('realCompany' in character, false);
  }
  for (const character of Object.values(CHARACTERS)) {
    assert.equal(browserCharactersModule.includes(character.realCompany.name), false);
    for (const alias of character.realCompany.newsAliases || []) {
      assert.equal(browserCharactersModule.includes(alias), false);
    }
  }
});
