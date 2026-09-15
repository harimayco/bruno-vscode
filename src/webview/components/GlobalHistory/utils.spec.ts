import { describe, it, expect } from 'vitest';
import { normalizeHistoryHeaders, normalizeHistoryParams } from './utils';

describe('GlobalHistory utils', () => {
  describe('normalizeHistoryHeaders', () => {
    it('returns empty array when headers is null or undefined', () => {
      expect(normalizeHistoryHeaders(null)).toEqual([]);
      expect(normalizeHistoryHeaders(undefined)).toEqual([]);
    });

    it('normalizes object format headers (Record<string, string>) into KeyValue array', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
        'X-Custom-Count': 42
      };
      const result = normalizeHistoryHeaders(headers);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'Content-Type',
        value: 'application/json',
        description: '',
        enabled: true
      });
      expect(result[0].uid).toBeDefined();
      expect(result[1]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer token123',
        description: '',
        enabled: true
      });
      expect(result[2]).toMatchObject({
        name: 'X-Custom-Count',
        value: '42',
        description: '',
        enabled: true
      });
    });

    it('normalizes array format headers and ensures required fields', () => {
      const headers = [
        { name: 'X-Header-1', value: 'Val 1', enabled: true },
        { key: 'X-Header-2', value: 'Val 2' },
        { uid: 'custom-uid', name: 'X-Header-3', value: 'Val 3', enabled: false, description: 'test desc' }
      ];
      const result = normalizeHistoryHeaders(headers);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'X-Header-1',
        value: 'Val 1',
        description: '',
        enabled: true
      });
      expect(result[0].uid).toBeDefined();

      expect(result[1]).toMatchObject({
        name: 'X-Header-2',
        value: 'Val 2',
        description: '',
        enabled: true
      });

      expect(result[2]).toMatchObject({
        uid: 'custom-uid',
        name: 'X-Header-3',
        value: 'Val 3',
        description: 'test desc',
        enabled: false
      });
    });

    it('handles raw string headers if present', () => {
      const raw = 'Content-Type: application/json\nAuthorization: Bearer xyz';
      const result = normalizeHistoryHeaders(raw);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Content-Type',
        value: 'application/json',
        enabled: true
      });
      expect(result[1]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer xyz',
        enabled: true
      });
    });
  });

  describe('normalizeHistoryParams', () => {
    it('returns empty array when params is null or undefined', () => {
      expect(normalizeHistoryParams(null)).toEqual([]);
      expect(normalizeHistoryParams(undefined)).toEqual([]);
    });

    it('normalizes array params preserving type and required fields', () => {
      const params = [
        { name: 'q', value: 'search' },
        { uid: 'p-1', name: 'id', value: '123', type: 'path', enabled: true }
      ];
      const result = normalizeHistoryParams(params);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'q',
        value: 'search',
        enabled: true,
        type: 'query'
      });
      expect(result[0].uid).toBeDefined();

      expect(result[1]).toMatchObject({
        uid: 'p-1',
        name: 'id',
        value: '123',
        enabled: true,
        type: 'path'
      });
    });

    it('normalizes object params into param array', () => {
      const params = { page: '1', limit: '10' };
      const result = normalizeHistoryParams(params);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'page',
        value: '1',
        type: 'query',
        enabled: true
      });
      expect(result[1]).toMatchObject({
        name: 'limit',
        value: '10',
        type: 'query',
        enabled: true
      });
    });
  });
});
