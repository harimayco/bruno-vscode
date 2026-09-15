import * as vscode from 'vscode';
import { HistoryEntry } from '@bruno-types';

const STORAGE_KEY = 'bruno.globalHistory';
const MAX_HISTORY_ITEMS = 500;

let extensionContext: vscode.ExtensionContext | null = null;

export function setHistoryExtensionContext(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

export class HistoryStore {
  private getMaxItems(): number {
    try {
      if (typeof vscode !== 'undefined' && vscode.workspace?.getConfiguration) {
        const config = vscode.workspace.getConfiguration('bruno.history');
        const max = config.get<number>('maxItems', MAX_HISTORY_ITEMS);
        return typeof max === 'number' && max > 0 ? max : MAX_HISTORY_ITEMS;
      }
      return MAX_HISTORY_ITEMS;
    } catch {
      return MAX_HISTORY_ITEMS;
    }
  }

  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (!extensionContext) {
      return defaultValue;
    }
    return extensionContext.globalState.get<T>(key, defaultValue);
  }

  private setInStorage<T>(key: string, value: T): void {
    if (!extensionContext) {
      return;
    }
    extensionContext.globalState.update(key, value);
  }

  getHistory(): HistoryEntry[] {
    const raw = this.getFromStorage<HistoryEntry[]>(STORAGE_KEY, []);
    return Array.isArray(raw) ? raw : [];
  }

  saveHistory(entries: HistoryEntry[]): HistoryEntry[] {
    const maxItems = this.getMaxItems();
    const validEntries = Array.isArray(entries) ? entries.slice(0, maxItems) : [];
    this.setInStorage(STORAGE_KEY, validEntries);
    return validEntries;
  }

  addEntry(entry: HistoryEntry): HistoryEntry[] {
    if (!entry || !entry.id) {
      return this.getHistory();
    }
    const maxItems = this.getMaxItems();
    const current = this.getHistory();
    // Remove if already exists (deduplicate / move to top)
    const filtered = current.filter((e) => e.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, maxItems);
    this.setInStorage(STORAGE_KEY, updated);
    return updated;
  }

  deleteEntry(id: string): HistoryEntry[] {
    const current = this.getHistory();
    const updated = current.filter((e) => e.id !== id);
    this.setInStorage(STORAGE_KEY, updated);
    return updated;
  }

  clearHistory(): HistoryEntry[] {
    this.setInStorage(STORAGE_KEY, []);
    return [];
  }
}

export const historyStore = new HistoryStore();
