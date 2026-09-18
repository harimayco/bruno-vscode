import { describe, it, expect } from 'vitest';
import { encodeUrl, parseQueryParams, buildQueryString } from './url';

describe('encodeUrl', () => {
  it('should return empty or non-string input unchanged', () => {
    expect(encodeUrl('')).toBe('');
    expect(encodeUrl(null as unknown as string)).toBe(null);
    expect(encodeUrl(undefined as unknown as string)).toBe(undefined);
  });

  it('should preserve URL path with special characters when there is no query string', () => {
    // Colons in path (common in Google Cloud / gRPC-transcoded APIs)
    expect(encodeUrl('https://api.example.com/v1/orders:cancel')).toBe('https://api.example.com/v1/orders:cancel');

    // Matrix parameters / semicolons
    expect(encodeUrl('https://api.example.com/users;id=123/profile')).toBe('https://api.example.com/users;id=123/profile');

    // Parentheses (OData style)
    expect(encodeUrl("https://api.example.com/Users('admin')")).toBe("https://api.example.com/Users('admin')");

    // Scoped packages / at signs
    expect(encodeUrl('https://registry.npmjs.org/@scope/pkg')).toBe('https://registry.npmjs.org/@scope/pkg');

    // URLs without explicit protocol
    expect(encodeUrl('localhost:3000/api:test')).toBe('localhost:3000/api:test');
  });

  it('should encode only query parameters while keeping path segments untouched', () => {
    const input = 'https://api.example.com/v1/orders:cancel?filter=status:active&user=John Doe';
    const expected = 'https://api.example.com/v1/orders:cancel?filter=status%3Aactive&user=John%20Doe';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should handle matrix params in path with encoded query params', () => {
    const input = 'http://localhost:3000/users;id=10/profile?view=full summary&tag=c++';
    const expected = 'http://localhost:3000/users;id=10/profile?view=full%20summary&tag=c%2B%2B';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should handle flags and empty values correctly', () => {
    const input = 'https://api.example.com/data?flag&empty=&valid=hello world';
    const expected = 'https://api.example.com/data?flag&empty=&valid=hello%20world';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should handle duplicate query parameter keys', () => {
    const input = 'https://api.example.com/search?tag=red apple&tag=green apple';
    const expected = 'https://api.example.com/search?tag=red%20apple&tag=green%20apple';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should preserve hash fragments while encoding query params', () => {
    const input = 'https://api.example.com/items:list?search=hello world#section-1';
    const expected = 'https://api.example.com/items:list?search=hello%20world#section-1';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should encode special characters in query parameter names', () => {
    const input = 'https://api.example.com/api?user name=Alice&id[0]=1';
    const expected = 'https://api.example.com/api?user%20name=Alice&id%5B0%5D=1';
    expect(encodeUrl(input)).toBe(expected);
  });

  it('should return URL unchanged if query string is empty after question mark', () => {
    expect(encodeUrl('https://api.example.com/api/test?')).toBe('https://api.example.com/api/test?');
  });
});

describe('parseQueryParams & buildQueryString', () => {
  it('should correctly round-trip query parameters with encoding', () => {
    const parsed = parseQueryParams('name=John%20Doe&greeting=hello world');
    const rebuilt = buildQueryString(parsed, { encode: true });
    expect(rebuilt).toBe('name=John%2520Doe&greeting=hello%20world');
  });

  it('should differentiate between valueless parameters and empty-string parameters', () => {
    const parsed = parseQueryParams('flag&empty=');
    expect(parsed).toEqual([
      { name: 'flag', value: undefined },
      { name: 'empty', value: '' }
    ]);
    const rebuilt = buildQueryString(parsed, { encode: true });
    expect(rebuilt).toBe('flag&empty=');
  });
});
