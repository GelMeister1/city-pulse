const test = require('node:test'), assert = require('node:assert');
const { pathToFileURL } = require('url'), path = require('path');
const INDEX = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const isOurs = require('../isours')(INDEX);

test('our page passes, with or without query and hash', () => {
  for (const u of [INDEX, INDEX + '?widget=1', INDEX + '?full=1&mode=span#x']) assert.ok(isOurs(u), u);
});
test('anything else fails', () => {
  for (const u of [INDEX + '.evil', INDEX.replace('index.html', 'other.html'), 'http://localhost/index.html',
    'https://example.com/?' + INDEX, 'about:blank', '', 'not a url', null, undefined]) assert.ok(!isOurs(u), String(u));
});
