import React, { useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HistoryEntry } from '@bruno-types';
import {
  IconSend,
  IconCopy,
  IconDeviceFloppy,
  IconTrash,
  IconLoader2,
  IconDots,
  IconEye
} from '@tabler/icons';
import { deleteHistoryEntry, recordHistoryEntry } from 'providers/ReduxStore/slices/history';
import { addTransientRequest } from 'providers/ReduxStore/slices/collections';
import { transientManager } from 'utils/transient-manager';
import { ipcRenderer } from 'utils/ipc';
import { buildHarRequest } from 'utils/codegenerator/har';
import { HTTPSnippet } from 'httpsnippet';
import toast from 'react-hot-toast';
import { sendNetworkRequest } from 'utils/network';
import { decodeVariableBraces } from 'utils/common';
import MenuDropdown from 'ui/MenuDropdown';
import HistoryDetailsModal from './HistoryDetailsModal';
import SaveToCollectionModal from './SaveToCollectionModal';

interface HistoryItemProps {
  entry: HistoryEntry;
}

const getMethodText = (method = '') => {
  const m = (method || 'GET').toUpperCase();
  return m.length > 5 ? m.substring(0, 3) : m;
};

const getStatusClass = (status?: number, isError?: boolean) => {
  if (isError || !status || status === 0) return 's-err';
  if (status >= 200 && status < 300) return 's-2xx';
  if (status >= 300 && status < 400) return 's-3xx';
  if (status >= 400 && status < 500) return 's-4xx';
  return 's-5xx';
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const HistoryItem: React.FC<HistoryItemProps> = ({ entry }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state: any) => state.collections.collections || []);

  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuDropdownRef = useRef<any>(null);

  const decodedUrl = decodeVariableBraces(entry.request?.url || '');
  const method = (entry.request.method || 'GET').toLowerCase();
  const methodText = getMethodText(entry.request.method || 'GET');
  const status = entry.response?.status;
  const isError = Boolean(entry.response?.error);

  const handleSend = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRunning) return;

    setIsRunning(true);
    const targetCollection = collections.find((c: any) => c.uid === entry.source?.collectionUid) || collections[0] || {
      uid: 'temp-collection',
      pathname: '',
      runtimeVariables: {}
    };

    const tempItem = {
      uid: entry.source?.itemUid || entry.id,
      name: entry.source?.itemName || 'History Request',
      type: 'http-request',
      request: {
        url: decodedUrl,
        method: entry.request.method,
        headers: Array.isArray(entry.request.headers) ? entry.request.headers : [],
        params: entry.request.params || [],
        body: entry.request.body || { mode: 'none' },
        auth: entry.request.auth || {}
      }
    };

    try {
      const response: any = await sendNetworkRequest(
        tempItem as any,
        targetCollection as any,
        undefined,
        targetCollection.runtimeVariables || {}
      );

      dispatch(
        recordHistoryEntry({
          ...entry,
          id: entry.id,
          timestamp: Date.now(),
          request: {
            ...entry.request,
            url: decodedUrl
          },
          response: {
            status: typeof response.status === 'number' ? response.status : undefined,
            statusText: String(response.statusText || response.status || ''),
            duration: typeof response.duration === 'number' ? response.duration : 0,
            size: typeof response.size === 'number' ? response.size : 0,
            headers: response.headers as any,
            data: response.data,
            error: null
          }
        }) as any
      );
      toast.success(`Sent: ${response.status || 200} OK`);
    } catch (err: any) {
      toast.error(err?.message || 'Request failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const collection = collections.find((c: any) => c.uid === entry.source?.collectionUid) || collections[0];
    if (!collection) {
      toast.error('Please open or create a collection first to edit requests in editor');
      return;
    }

    const transientItem = transientManager.createHttpRequest(collection);
    
    // Deterministic UID linked to this history entry so clicking it again reveals the existing unsaved tab
    const itemUid = `history-${entry.id}`;
    transientItem.uid = itemUid;

    // Load exact snapshot data from history
    transientItem.request = {
      ...transientItem.request,
      url: decodedUrl,
      method: entry.request?.method || 'GET',
      headers: Array.isArray(entry.request?.headers) ? entry.request.headers : [],
      params: entry.request?.params || [],
      body: entry.request?.body || { mode: 'none' },
      auth: entry.request?.auth || {}
    };

    // Load snapshot response from history so result pane immediately displays the previous execution result
    if (entry.response) {
      let dataBuffer = (entry.response as any).dataBuffer;
      if (!dataBuffer && entry.response.data !== undefined && entry.response.data !== null) {
        try {
          const str = typeof entry.response.data === 'string'
            ? entry.response.data
            : JSON.stringify(entry.response.data);
          dataBuffer = Buffer.from(str).toString('base64');
        } catch {
          dataBuffer = '';
        }
      }

      (transientItem as any).response = {
        status: entry.response.status,
        statusText: entry.response.statusText,
        duration: entry.response.duration,
        size: entry.response.size,
        headers: entry.response.headers,
        data: entry.response.data,
        dataBuffer: dataBuffer,
        error: entry.response.error
      };
    }

    dispatch(addTransientRequest({ collectionUid: collection.uid, item: transientItem }));
    ipcRenderer.send('sidebar:open-transient-request', {
      itemUid: transientItem.uid,
      itemName: transientItem.name,
      collectionUid: collection.uid,
      collectionPath: collection.pathname,
      item: transientItem
    });
  };

  const handleCopyCurl = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { har, unhash } = buildHarRequest({
        request: {
          url: decodedUrl,
          method: entry.request.method,
          body: entry.request.body,
          params: entry.request.params as any,
          auth: entry.request.auth
        },
        headers: (Array.isArray(entry.request.headers) ? entry.request.headers : []) as any
      });
      const snippet = new HTTPSnippet(har);
      const code = unhash ? unhash(snippet.convert('shell', 'curl') as string) : (snippet.convert('shell', 'curl') as string);
      navigator.clipboard.writeText(code);
      toast.success('cURL copied to clipboard');
    } catch {
      toast.error('Failed to copy cURL');
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    dispatch(deleteHistoryEntry(entry.id) as any);
    toast.success('Removed from history');
  };

  const menuItems = useMemo(() => [
    {
      id: 'send',
      leftSection: <IconSend size={15} />,
      label: 'Send Request',
      onClick: () => handleSend()
    },
    {
      id: 'details',
      leftSection: <IconEye size={15} />,
      label: 'View Details',
      onClick: () => setShowDetails(true)
    },
    {
      id: 'copy-curl',
      leftSection: <IconCopy size={15} />,
      label: 'Copy as cURL',
      onClick: () => handleCopyCurl()
    },
    {
      id: 'save',
      leftSection: <IconDeviceFloppy size={15} />,
      label: 'Save to Collection',
      onClick: () => setShowSaveModal(true)
    },
    {
      id: 'delete',
      leftSection: <IconTrash size={15} />,
      label: 'Delete from History',
      onClick: () => handleDelete()
    }
  ], [entry]);

  return (
    <>
      <div
        className={`history-item-card ${isMenuOpen ? 'has-menu-open' : ''}`}
        onClick={handleRowClick}
        title="Click to edit in Request Editor"
        data-testid="history-item-card"
      >
        <div className="item-main">
          <span className={`method-badge method-${method}`}>{methodText}</span>

          <span className="url-text" title={decodedUrl}>
            {decodedUrl || '/'}
            {entry.source?.collectionName && (
              <span className="origin-hint">
                ({entry.source.collectionName}{entry.source.itemName ? ` / ${entry.source.itemName}` : ''})
              </span>
            )}
          </span>
        </div>

        <div className="item-metrics">
          <span className={`status-pill ${getStatusClass(status, isError)}`}>
            {status ? `${status}` : (isError ? 'Error' : '-')}
          </span>

          {entry.response?.duration !== undefined && entry.response.duration > 0 && (
            <span className="metric-text">{entry.response.duration} ms</span>
          )}

          <span className="time-text">{formatTime(entry.timestamp)}</span>
        </div>

        <div className="item-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn delete-btn"
            title="Delete from History"
            onClick={handleDelete}
          >
            <IconTrash size={15} />
          </button>

          <MenuDropdown
            ref={menuDropdownRef}
            items={menuItems}
            placement="bottom-end"
            offset={[0, 2]}
            appendTo={() => document.body}
            popperOptions={{ strategy: 'fixed' }}
            onChange={setIsMenuOpen}
          >
            <button className="action-btn" title="More actions" type="button">
              <IconDots size={16} />
            </button>
          </MenuDropdown>
        </div>
      </div>

      {showDetails && (
        <HistoryDetailsModal entry={entry} onClose={() => setShowDetails(false)} />
      )}

      {showSaveModal && (
        <SaveToCollectionModal entry={entry} onClose={() => setShowSaveModal(false)} />
      )}
    </>
  );
};

export default HistoryItem;
