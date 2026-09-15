import { uuid } from 'utils/common';

export interface NormalizedHeader {
  uid: string;
  name: string;
  value: string;
  description: string;
  enabled: boolean;
}

export interface NormalizedParam {
  uid: string;
  name: string;
  value: string;
  description: string;
  enabled: boolean;
  type: 'query' | 'path';
}

/**
 * Normalizes history headers from either an Array, Object (Record<string, unknown>),
 * or string into Bruno's standardized KeyValue header array format.
 */
export const normalizeHistoryHeaders = (headers: unknown): NormalizedHeader[] => {
  if (!headers) {
    return [];
  }

  if (Array.isArray(headers)) {
    return headers.map((h: any) => {
      const name = h?.name !== undefined ? String(h.name) : (h?.key !== undefined ? String(h.key) : '');
      const value = h?.value != null ? String(h.value) : '';
      return {
        uid: h?.uid || uuid(),
        name,
        value,
        description: typeof h?.description === 'string' ? h.description : '',
        enabled: h?.enabled !== false
      };
    });
  }

  if (typeof headers === 'object') {
    return Object.entries(headers as Record<string, unknown>).map(([name, value]) => ({
      uid: uuid(),
      name: String(name),
      value: value != null ? String(value) : '',
      description: '',
      enabled: true
    }));
  }

  if (typeof headers === 'string') {
    return headers
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
          return {
            uid: uuid(),
            name: line,
            value: '',
            description: '',
            enabled: true
          };
        }
        return {
          uid: uuid(),
          name: line.substring(0, colonIndex).trim(),
          value: line.substring(colonIndex + 1).trim(),
          description: '',
          enabled: true
        };
      });
  }

  return [];
};

/**
 * Normalizes history params from either an Array or Object (Record<string, unknown>)
 * into Bruno's standardized param array format.
 */
export const normalizeHistoryParams = (params: unknown): NormalizedParam[] => {
  if (!params) {
    return [];
  }

  if (Array.isArray(params)) {
    return params.map((p: any) => {
      const name = p?.name !== undefined ? String(p.name) : (p?.key !== undefined ? String(p.key) : '');
      const value = p?.value != null ? String(p.value) : '';
      return {
        uid: p?.uid || uuid(),
        name,
        value,
        description: typeof p?.description === 'string' ? p.description : '',
        enabled: p?.enabled !== false,
        type: p?.type === 'path' ? 'path' : 'query'
      };
    });
  }

  if (typeof params === 'object') {
    return Object.entries(params as Record<string, unknown>).map(([name, value]) => ({
      uid: uuid(),
      name: String(name),
      value: value != null ? String(value) : '',
      description: '',
      enabled: true,
      type: 'query'
    }));
  }

  return [];
};
