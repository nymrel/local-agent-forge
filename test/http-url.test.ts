import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ComfyUIAdapter,
  LMStudioAdapter,
  OllamaAdapter,
  VLLMAdapter,
  WhisperAdapter
} from '../src/adapters/index.js';
import { normalizeHttpBaseUrl } from '../src/utils/http-url.js';

describe('HTTP adapter endpoint boundary', () => {
  test('normalizes credential-free HTTP(S) base URLs', () => {
    assert.equal(normalizeHttpBaseUrl(' https://Example.test:8443/api/// '), 'https://example.test:8443/api');
    assert.equal(normalizeHttpBaseUrl('http://[::1]:11434/'), 'http://[::1]:11434');
    assert.equal(normalizeHttpBaseUrl('http://Example.test:80/api///'), 'http://example.test/api');
    assert.equal(normalizeHttpBaseUrl('https://Example.test:443/api///'), 'https://example.test/api');
    assert.equal(normalizeHttpBaseUrl('https://Example.test\\api///'), 'https://example.test/api');
  });

  test('rejects unsupported, credentialed, relative, and ambiguous URLs', () => {
    for (const candidate of [
      '',
      '/api',
      'file:///tmp/socket',
      'ftp://example.test/models',
      'http://user:secret@example.test',
      'https://example.test/api?token=secret',
      'https://example.test/api#fragment',
      'http://example.test/\nheader'
    ]) {
      assert.throws(() => normalizeHttpBaseUrl(candidate), TypeError, candidate);
    }
  });

  test('all adapters apply the shared validator to custom endpoints', () => {
    const constructors = [OllamaAdapter, VLLMAdapter, LMStudioAdapter, ComfyUIAdapter, WhisperAdapter];

    for (const Adapter of constructors) {
      const adapter = new Adapter({ endpoint: 'https://models.example.test/api///' });
      assert.equal(adapter.endpoint, 'https://models.example.test/api');
      assert.throws(() => new Adapter({ endpoint: 'file:///tmp/adapter.sock' }), TypeError);
      assert.throws(() => new Adapter({ endpoint: 'https://user:secret@models.example.test' }), TypeError);
    }
  });
});
