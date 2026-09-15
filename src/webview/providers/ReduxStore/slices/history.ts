import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HistoryEntry } from '@bruno-types';
import { ipcRenderer } from 'utils/ipc';

const MAX_HISTORY = 500;

export interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;
  searchQuery: string;
  methodFilter: string;
  statusFilter: string;
  selectedEntryId: string | null;
}

const initialState: HistoryState = {
  entries: [],
  isLoading: false,
  searchQuery: '',
  methodFilter: 'ALL',
  statusFilter: 'ALL',
  selectedEntryId: null
};

export const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setHistory: (state, action: PayloadAction<HistoryEntry[]>) => {
      state.entries = Array.isArray(action.payload) ? action.payload : [];
      state.isLoading = false;
    },
    setHistoryLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addHistoryEntry: (state, action: PayloadAction<HistoryEntry>) => {
      if (!action.payload || !action.payload.id) return;
      const filtered = state.entries.filter((e: HistoryEntry) => e.id !== action.payload.id);
      state.entries = [action.payload, ...filtered].slice(0, MAX_HISTORY);
    },
    removeHistoryEntry: (state, action: PayloadAction<{ id: string }>) => {
      state.entries = state.entries.filter((e: HistoryEntry) => e.id !== action.payload.id);
      if (state.selectedEntryId === action.payload.id) {
        state.selectedEntryId = null;
      }
    },
    clearHistory: (state) => {
      state.entries = [];
      state.selectedEntryId = null;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setMethodFilter: (state, action: PayloadAction<string>) => {
      state.methodFilter = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
    setSelectedEntryId: (state, action: PayloadAction<string | null>) => {
      state.selectedEntryId = action.payload;
    }
  }
});

export const {
  setHistory,
  setHistoryLoading,
  addHistoryEntry,
  removeHistoryEntry,
  clearHistory,
  setSearchQuery,
  setMethodFilter,
  setStatusFilter,
  setSelectedEntryId
} = historySlice.actions;

export const fetchGlobalHistory = () => async (dispatch: any) => {
  dispatch(setHistoryLoading(true));
  try {
    const history = (await ipcRenderer.invoke('history:get-all')) as HistoryEntry[];
    dispatch(setHistory(history || []));
  } catch (error) {
    console.error('Failed to fetch history:', error);
    dispatch(setHistoryLoading(false));
  }
};

export const recordHistoryEntry = (entry: HistoryEntry) => async (dispatch: any) => {
  dispatch(addHistoryEntry(entry));
  try {
    ipcRenderer.invoke('history:add', entry).catch((err) => {
      console.error('Failed to persist history entry:', err);
    });
  } catch (error) {
    console.error('Failed to record history entry:', error);
  }
};

export const deleteHistoryEntry = (id: string) => async (dispatch: any) => {
  dispatch(removeHistoryEntry({ id }));
  try {
    ipcRenderer.invoke('history:delete', id).catch((err) => {
      console.error('Failed to delete history entry:', err);
    });
  } catch (error) {
    console.error('Failed to delete history entry:', error);
  }
};

export const clearAllHistory = () => async (dispatch: any) => {
  dispatch(clearHistory());
  try {
    ipcRenderer.invoke('history:clear').catch((err) => {
      console.error('Failed to clear history:', err);
    });
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

export default historySlice.reducer;
