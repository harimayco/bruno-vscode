import { describe, expect, it } from 'vitest';
import {
  safeInterpolate,
  interpolateHeaders,
  interpolateParams,
  interpolateAuth,
  interpolateBody
} from './interpolate';

describe('codegenerator - interpolate helpers', () => {
  const variables = {
    baseUrl: 'https://api.example.com',
    token: 'my-secret-token',
    apiKeyHeader: 'X-My-Key',
    apiKeyValue: 'val-12345',
    username: 'admin',
    password: 'password123',
    userId: '42',
    name: 'John Doe'
  };

  describe('safeInterpolate', () => {
    it('returns interpolated string when variables match', () => {
      expect(safeInterpolate('Bearer {{token}}', variables)).toBe('Bearer my-secret-token');
      expect(safeInterpolate('{{baseUrl}}/users/{{userId}}', variables)).toBe('https://api.example.com/users/42');
    });

    it('returns original string if no braces present', () => {
      expect(safeInterpolate('application/json', variables)).toBe('application/json');
    });

    it('returns empty string for null or undefined', () => {
      expect(safeInterpolate(null, variables)).toBe('');
      expect(safeInterpolate(undefined, variables)).toBe('');
    });
  });

  describe('interpolateHeaders', () => {
    it('interpolates both header names and values', () => {
      const headers = [
        { name: 'Authorization', value: 'Bearer {{token}}', enabled: true },
        { name: '{{apiKeyHeader}}', value: '{{apiKeyValue}}', enabled: true },
        { name: 'Content-Type', value: 'application/json', enabled: true }
      ];

      const result = interpolateHeaders(headers, variables);

      expect(result).toEqual([
        { name: 'Authorization', value: 'Bearer my-secret-token', enabled: true },
        { name: 'X-My-Key', value: 'val-12345', enabled: true },
        { name: 'Content-Type', value: 'application/json', enabled: true }
      ]);
    });
  });

  describe('interpolateParams', () => {
    it('interpolates query and path params', () => {
      const params = [
        { name: 'id', value: '{{userId}}', enabled: true, type: 'query' },
        { name: 'user_id', value: '{{userId}}', enabled: true, type: 'path' }
      ];

      const result = interpolateParams(params, variables);

      expect(result).toEqual([
        { name: 'id', value: '42', enabled: true, type: 'query' },
        { name: 'user_id', value: '42', enabled: true, type: 'path' }
      ]);
    });
  });

  describe('interpolateAuth', () => {
    it('interpolates basic auth', () => {
      const auth = {
        mode: 'basic',
        basic: {
          username: '{{username}}',
          password: '{{password}}'
        }
      };

      const result = interpolateAuth(auth, variables);

      expect(result.basic.username).toBe('admin');
      expect(result.basic.password).toBe('password123');
    });

    it('interpolates bearer auth', () => {
      const auth = {
        mode: 'bearer',
        bearer: {
          token: '{{token}}'
        }
      };

      const result = interpolateAuth(auth, variables);

      expect(result.bearer.token).toBe('my-secret-token');
    });

    it('interpolates apikey auth', () => {
      const auth = {
        mode: 'apikey',
        apikey: {
          key: '{{apiKeyHeader}}',
          value: '{{apiKeyValue}}'
        }
      };

      const result = interpolateAuth(auth, variables);

      expect(result.apikey.key).toBe('X-My-Key');
      expect(result.apikey.value).toBe('val-12345');
    });
  });

  describe('interpolateBody', () => {
    it('interpolates JSON string body', () => {
      const body = {
        mode: 'json',
        json: '{"id": "{{userId}}", "name": "{{name}}"}'
      };

      const result = interpolateBody(body, variables);

      expect(result.json).toBe('{"id": "42", "name": "John Doe"}');
    });

    it('interpolates formUrlEncoded body', () => {
      const body = {
        mode: 'formUrlEncoded',
        formUrlEncoded: [
          { name: 'user', value: '{{name}}', enabled: true }
        ]
      };

      const result = interpolateBody(body, variables);

      expect(result.formUrlEncoded[0].value).toBe('John Doe');
    });
  });
});
