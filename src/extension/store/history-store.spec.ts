import { describe, expect, it, beforeEach } from 'vitest';
import { HistoryStore, setHistoryExtensionContext } from './history-store';
import { HistoryEntry } from '@bruno-types';

describe('HistoryStore', () => {
  let mockStorage: Record<string, unknown> = {};
  let store: HistoryStore;

  beforeEach(() => {
    mockStorage = {};
    const mockContext: any = {
      globalState: {
        get: (key: string, defaultValue: unknown) => (key in mockStorage ? mockStorage[key] : defaultValue),
        update: (key: string, value: unknown) => {
          mockStorage[key] = value;
          return Promise.resolve();
        }
      }
    };
    setHistoryExtensionContext(mockContext);
    store = new HistoryStore();
  });

  it('starts with empty history', () => {
    expect(store.getHistory()).toEqual([]);
  });

  it('adds history entries and prepends newest', () => {
    const entry1: HistoryEntry = {
      id: 'entry-1',
      timestamp: 1000,
      request: { url: 'https://httpbin.org/get', method: 'GET' }
    };
    const entry2: HistoryEntry = {
      id: 'entry-2',
      timestamp: 2000,
      request: { url: 'https://httpbin.org/post', method: 'POST' }
    };

    store.addEntry(entry1);
    store.addEntry(entry2);

    const history = store.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('entry-2');
    expect(history[1].id).toBe('entry-1');
  });

  it('deduplicates existing entry and brings it to top', () => {
    const entry1: HistoryEntry = {
      id: 'entry-1',
      timestamp: 1000,
      request: { url: 'https://httpbin.org/get', method: 'GET' }
    };
    const entry2: HistoryEntry = {
      id: 'entry-2',
      timestamp: 2000,
      request: { url: 'https://httpbin.org/post', method: 'POST' }
    };

    store.addEntry(entry1);
    store.addEntry(entry2);
    // Re-add entry-1 with updated timestamp
    store.addEntry({ ...entry1, timestamp: 3000 });

    const history = store.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('entry-1');
    expect(history[0].timestamp).toBe(3000);
  });

  it('deletes an entry by id', () => {
    const entry1: HistoryEntry = {
      id: 'entry-1',
      timestamp: 1000,
      request: { url: 'https://httpbin.org/get', method: 'GET' }
    };
    store.addEntry(entry1);
    expect(store.getHistory()).toHaveLength(1);

    store.deleteEntry('entry-1');
    expect(store.getHistory()).toHaveLength(0);
  });

  it('clears all history', () => {
    store.addEntry({ id: '1', timestamp: 1, request: { url: '/a', method: 'GET' } });
    store.addEntry({ id: '2', timestamp: 2, request: { url: '/b', method: 'GET' } });
    expect(store.getHistory()).toHaveLength(2);

    store.clearHistory();
    expect(store.getHistory()).toEqual([]);
  });

  it('limits history to 500 entries', () => {
    for (let i = 0; i < 550; i++) {
      store.addEntry({
        id: `entry-${i}`,
        timestamp: i,
        request: { url: `/api/${i}`, method: 'GET' }
      });
    }

    const history = store.getHistory();
    expect(history).toHaveLength(500);
    expect(history[0].id).toBe('entry-549');
  });
});
