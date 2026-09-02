import { describe, expect, it } from 'vitest';
import { HTTPSnippet } from 'httpsnippet';
import { buildHarRequest, patternHasher } from './har';
import { getAuthHeaders } from './auth';

describe('codegenerator - har and auth', () => {
  it('handles GET request with template variable {{baseUrl}}', () => {
    const { har, unhash } = buildHarRequest({
      request: {
        url: '{{baseUrl}}/api/v1/users',
        method: 'GET',
        body: { mode: 'none' },
        params: []
      },
      headers: []
    });

    const snippet = new HTTPSnippet(har);
    const code = unhash(snippet.convert('shell', 'curl') as string);
    expect(code).toContain('curl');
    expect(code).toContain('{{baseUrl}}/api/v1/users');
  });

  it('sanitizes null, undefined and empty headers without throwing validation error', () => {
    const { har, unhash } = buildHarRequest({
      request: {
        url: 'https://httpbin.org/get',
        method: 'GET',
        body: { mode: 'none' },
        params: [
          { name: 'page', value: '1', enabled: true, type: 'query' },
          { name: 'nullParam', value: null as any, enabled: true, type: 'query' },
          { name: 'undefinedParam', value: undefined as any, enabled: true, type: 'query' },
          { name: '', value: 'emptyName', enabled: true, type: 'query' },
          { name: 'disabled', value: 'off', enabled: false, type: 'query' }
        ]
      },
      headers: [
        { name: 'Accept', value: 'application/json', enabled: true },
        { name: 'X-Null', value: null as any, enabled: true },
        { name: 'X-Undefined', value: undefined as any, enabled: true },
        { name: '', value: 'noName', enabled: true },
        { name: 'X-Disabled', value: 'off', enabled: false }
      ]
    });

    const snippet = new HTTPSnippet(har);
    const code = unhash(snippet.convert('shell', 'curl') as string);
    expect(code).toContain('https://httpbin.org/get');
    expect(code).toContain('Accept: application/json');
  });

  it('handles POST request with JSON object or null body', () => {
    const { har: harObj } = buildHarRequest({
      request: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: { mode: 'json', json: { key: 'value', num: 123 } },
        params: []
      },
      headers: []
    });

    const snippetObj = new HTTPSnippet(harObj);
    const codeObj = snippetObj.convert('shell', 'curl') as string;
    expect(codeObj).toContain('application/json');

    const { har: harNull } = buildHarRequest({
      request: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: { mode: 'json', json: null },
        params: []
      },
      headers: []
    });

    const snippetNull = new HTTPSnippet(harNull);
    const codeNull = snippetNull.convert('shell', 'curl') as string;
    expect(codeNull).toContain('POST');
  });

  it('handles formUrlEncoded and multipartForm with null values', () => {
    const { har: harForm } = buildHarRequest({
      request: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: {
          mode: 'formUrlEncoded',
          formUrlEncoded: [
            { name: 'user', value: 'admin', enabled: true },
            { name: 'nullField', value: null, enabled: true },
            { name: '', value: 'skip', enabled: true }
          ]
        },
        params: []
      },
      headers: []
    });

    const snippetForm = new HTTPSnippet(harForm);
    const codeForm = snippetForm.convert('shell', 'curl') as string;
    expect(codeForm).toContain('application/x-www-form-urlencoded');

    const { har: harMulti } = buildHarRequest({
      request: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: {
          mode: 'multipartForm',
          multipartForm: [
            { name: 'text', value: 'hello', enabled: true },
            { name: 'nullField', value: null, enabled: true },
            { name: '', value: 'skip', enabled: true }
          ]
        },
        params: []
      },
      headers: []
    });

    const snippetMulti = new HTTPSnippet(harMulti);
    const codeMulti = snippetMulti.convert('shell', 'curl') as string;
    expect(codeMulti).toContain('multipart/form-data');
  });

  it('handles API key and Bearer auth headers', () => {
    const headers = getAuthHeaders(undefined, {
      mode: 'apikey',
      apikey: {
        key: 'X-API-Key',
        value: 'secret-123',
        placement: 'header'
      }
    });

    expect(headers).toEqual([
      {
        enabled: true,
        name: 'X-API-Key',
        value: 'secret-123'
      }
    ]);
  });
});
