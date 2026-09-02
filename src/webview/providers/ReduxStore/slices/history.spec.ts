import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/ipc', () => ({
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue([]),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

import historyReducer, {
  addHistoryEntry,
  removeHistoryEntry,
  clearHistory,
  setHistory,
  setSearchQuery,
  setMethodFilter,
  setStatusFilter,
  HistoryState
} from './history';
import { HistoryEntry } from '@bruno-types';

describe('history slice', () => {
  const initial: HistoryState = {
    entries: [],
    isLoading: false,
    searchQuery: '',
    methodFilter: 'ALL',
    statusFilter: 'ALL',
    selectedEntryId: null
  };

  it('adds history entry', () => {
    const entry: HistoryEntry = {
      id: 'h-1',
      timestamp: 1000,
      request: { url: 'https://httpbin.org/get', method: 'GET' }
    };

    const state = historyReducer(initial, addHistoryEntry(entry));
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].id).toBe('h-1');
  });

  it('removes history entry', () => {
    const stateWithEntries: HistoryState = {
      ...initial,
      entries: [
        { id: 'h-1', timestamp: 1000, request: { url: '/1', method: 'GET' } },
        { id: 'h-2', timestamp: 2000, request: { url: '/2', method: 'POST' } }
      ]
    };

    const state = historyReducer(stateWithEntries, removeHistoryEntry({ id: 'h-1' }));
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].id).toBe('h-2');
  });

  it('clears all history entries', () => {
    const stateWithEntries: HistoryState = {
      ...initial,
      entries: [{ id: 'h-1', timestamp: 1000, request: { url: '/1', method: 'GET' } }]
    };

    const state = historyReducer(stateWithEntries, clearHistory());
    expect(state.entries).toHaveLength(0);
  });

  it('updates filters and search query', () => {
    let state = historyReducer(initial, setSearchQuery('users'));
    expect(state.searchQuery).toBe('users');

    state = historyReducer(state, setMethodFilter('POST'));
    expect(state.methodFilter).toBe('POST');

    state = historyReducer(state, setStatusFilter('2xx'));
    expect(state.statusFilter).toBe('2xx');
  });

  it('sets whole history list from storage', () => {
    const entries: HistoryEntry[] = [
      { id: 'h-1', timestamp: 1000, request: { url: '/1', method: 'GET' } }
    ];
    const state = historyReducer(initial, setHistory(entries));
    expect(state.entries).toHaveLength(1);
    expect(state.isLoading).toBe(false);
  });
});
