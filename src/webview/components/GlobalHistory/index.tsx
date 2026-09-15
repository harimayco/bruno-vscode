import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconHistory,
  IconSearch,
  IconX,
  IconTrash,
  IconClock,
  IconRefresh
} from '@tabler/icons';
import {
  fetchGlobalHistory,
  clearAllHistory,
  setHistory,
  setSearchQuery,
  setMethodFilter,
  setStatusFilter
} from 'providers/ReduxStore/slices/history';
import { RootState } from 'providers/ReduxStore';
import { ipcRenderer } from 'utils/ipc';
import { HistoryEntry } from '@bruno-types';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import HistoryItem from './HistoryItem';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';

const METHOD_OPTIONS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STATUS_OPTIONS = [
  { label: 'All Status', value: 'ALL' },
  { label: '2xx Success', value: '2xx' },
  { label: '4xx Client Error', value: '4xx' },
  { label: '5xx Server Error', value: '5xx' },
  { label: 'Errors', value: 'error' }
];

function getDateCategory(timestamp: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const lastWeek = today - 86400000 * 7;

  if (timestamp >= today) return 'Today';
  if (timestamp >= yesterday) return 'Yesterday';
  if (timestamp >= lastWeek) return 'Last 7 Days';
  return 'Older';
}

const GlobalHistory: React.FC = () => {
  const dispatch = useDispatch();
  const { entries, searchQuery, methodFilter, statusFilter, isLoading } = useSelector(
    (state: RootState) => state.history
  );

  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    dispatch(fetchGlobalHistory() as any);

    const unsub = ipcRenderer.on('main:history-updated', (updated: HistoryEntry[]) => {
      if (Array.isArray(updated)) {
        dispatch(setHistory(updated));
      }
    });

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [dispatch]);

  const handleClearAll = () => {
    dispatch(clearAllHistory() as any);
    setShowClearModal(false);
    toast.success('History cleared');
  };

  const filteredEntries = useMemo(() => {
    return (entries || []).filter((entry) => {
      // 1. Method filter
      if (methodFilter !== 'ALL') {
        if ((entry.request?.method || '').toUpperCase() !== methodFilter) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        const status = entry.response?.status;
        const isError = Boolean(entry.response?.error);
        if (statusFilter === '2xx' && (!status || status < 200 || status >= 300)) return false;
        if (statusFilter === '4xx' && (!status || status < 400 || status >= 500)) return false;
        if (statusFilter === '5xx' && (!status || status < 500 || status >= 600)) return false;
        if (statusFilter === 'error' && !isError && status !== 0) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const urlMatch = (entry.request?.url || '').toLowerCase().includes(query);
        const methodMatch = (entry.request?.method || '').toLowerCase().includes(query);
        const nameMatch = (entry.source?.itemName || '').toLowerCase().includes(query);
        const colMatch = (entry.source?.collectionName || '').toLowerCase().includes(query);
        const statusMatch = String(entry.response?.status || '').includes(query);
        return urlMatch || methodMatch || nameMatch || colMatch || statusMatch;
      }

      return true;
    });
  }, [entries, methodFilter, statusFilter, searchQuery]);

  // Group by Date Categories
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: []
    };

    filteredEntries.forEach((entry) => {
      const cat = getDateCategory(entry.timestamp);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(entry);
    });

    return groups;
  }, [filteredEntries]);

  return (
    <StyledWrapper data-testid="global-history-page">
      <div className="history-header">
        <div className="header-top">
          <div className="title-area">
            <IconHistory size={22} className="text-primary" />
            <h1 className="title">History</h1>
            <span className="count-badge">{entries.length} requests</span>
          </div>

          <div className="header-actions">
            <Button
              size="sm"
              color="secondary"
              onClick={() => dispatch(fetchGlobalHistory() as any)}
              disabled={isLoading}
            >
              <IconRefresh size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="ml-1">Refresh</span>
            </Button>

            {entries.length > 0 && (
              <Button
                size="sm"
                color="secondary"
                onClick={() => setShowClearModal(true)}
              >
                <IconTrash size={14} />
                <span className="ml-1">Clear History</span>
              </Button>
            )}
          </div>
        </div>

        <div className="filter-controls">
          <div className="search-box-wrapper">
            <IconSearch size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search by URL, method, status, or collection..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
            {searchQuery && (
              <IconX
                size={14}
                className="clear-search-btn"
                onClick={() => dispatch(setSearchQuery(''))}
              />
            )}
          </div>

          <div className="pills-group">
            {METHOD_OPTIONS.map((m) => (
              <button
                key={m}
                className={`filter-pill ${methodFilter === m ? 'active' : ''}`}
                onClick={() => dispatch(setMethodFilter(m))}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="pills-group">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                className={`filter-pill ${statusFilter === s.value ? 'active' : ''}`}
                onClick={() => dispatch(setStatusFilter(s.value))}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="history-content">
        {filteredEntries.length === 0 ? (
          <div className="empty-state">
            <IconClock size={48} strokeWidth={1.2} className="empty-icon" />
            <div className="empty-title">
              {entries.length === 0 ? 'No Request History Yet' : 'No Matching History Found'}
            </div>
            <div className="empty-desc">
              {entries.length === 0
                ? 'Send a request from any collection or transient editor tab to automatically track history here.'
                : 'Try adjusting your search query or method/status filters.'}
            </div>
          </div>
        ) : (
          Object.entries(groupedEntries).map(([dateLabel, items]) => {
            if (!items.length) return null;
            return (
              <div key={dateLabel} className="date-group">
                <div className="date-heading">
                  <span>{dateLabel}</span>
                  <span>{items.length} {items.length === 1 ? 'request' : 'requests'}</span>
                </div>
                <div className="history-list">
                  {items.map((entry) => (
                    <HistoryItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showClearModal && (
        <Modal
          title="Clear History"
          confirmText="Clear All"
          confirmButtonColor="danger"
          handleSubmit={handleClearAll}
          handleCancel={() => setShowClearModal(false)}
        >
          <div className="text-sm">
            Are you sure you want to clear all request history? This action cannot be undone.
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default GlobalHistory;
