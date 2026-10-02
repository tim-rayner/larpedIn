import { expect, test } from 'bun:test';
import { characterForNewsStory } from '../src/routing';

test('news metadata maps to the appropriate fictional CEO', () => {
  expect(characterForNewsStory({title: 'A story', categories: ['OpenAI'], url: 'one'}).characterId).toBe('scam-altman');
  expect(characterForNewsStory({title: 'New GPU launch', categories: ['Hardware'], url: 'two'}).characterId).toBe('jensen-hype');
  expect(characterForNewsStory({title: 'Robotaxi update', categories: ['Transportation'], url: 'three'}).characterId).toBe('elong-husk');
  expect(characterForNewsStory({title: 'A metadata startup', categories: ['Databases'], url: 'four'}).characterId).not.toBe('mark-zuckerbot');
});
