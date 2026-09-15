import { registerHandler, broadcastToAllWebviews } from './handlers';
import { historyStore } from '../store/history-store';
import { HistoryEntry } from '@bruno-types';

export default function registerHistoryIpc(): void {
  registerHandler('history:get-all', async () => {
    try {
      return historyStore.getHistory();
    } catch (error) {
      console.error('Error in history:get-all:', error);
      return [];
    }
  });

  registerHandler('history:add', async (args: unknown[]) => {
    try {
      const entry = args[0] as HistoryEntry;
      if (entry) {
        const updated = historyStore.addEntry(entry);
        broadcastToAllWebviews('main:history-updated', updated);
        return updated;
      }
      return historyStore.getHistory();
    } catch (error) {
      console.error('Error in history:add:', error);
      return historyStore.getHistory();
    }
  });

  registerHandler('history:delete', async (args: unknown[]) => {
    try {
      const id = args[0] as string;
      if (id) {
        const updated = historyStore.deleteEntry(id);
        broadcastToAllWebviews('main:history-updated', updated);
        return updated;
      }
      return historyStore.getHistory();
    } catch (error) {
      console.error('Error in history:delete:', error);
      return historyStore.getHistory();
    }
  });

  registerHandler('history:clear', async () => {
    try {
      const updated = historyStore.clearHistory();
      broadcastToAllWebviews('main:history-updated', updated);
      return updated;
    } catch (error) {
      console.error('Error in history:clear:', error);
      return [];
    }
  });
}
