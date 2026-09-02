import React, { useState } from 'react';
import styled from 'styled-components';
import Modal from 'components/Modal';
import { HistoryEntry } from '@bruno-types';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';
import { buildHarRequest } from 'utils/codegenerator/har';
import { HTTPSnippet } from 'httpsnippet';
import { decodeVariableBraces } from 'utils/common';

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
    padding: 12px;
    background-color: var(--vscode-editorWidget-background, #252526);
    border-radius: 6px;
    border: 1px solid var(--vscode-editorWidget-border, #333333);

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #888888);
        text-transform: uppercase;
      }
      .val {
        font-size: 12px;
        font-weight: 600;
        color: var(--vscode-editor-foreground, #ffffff);
      }
    }
  }

  .tabs-header {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--vscode-editorGroup-border, #333333);
    padding-bottom: 4px;

    .tab-btn {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground, #888888);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 4px;

      &:hover {
        color: var(--vscode-editor-foreground, #ffffff);
      }

      &.active {
        background-color: var(--vscode-button-secondaryBackground, #2d2d2d);
        color: var(--vscode-editor-foreground, #ffffff);
      }
    }
  }

  .code-block {
    background-color: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-editorWidget-border, #333333);
    border-radius: 4px;
    padding: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    color: var(--vscode-editor-foreground, #cccccc);
    max-height: 250px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .kv-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-editorWidget-border, #333333);
    }
    th {
      color: var(--vscode-descriptionForeground, #888888);
      font-weight: 600;
      font-size: 11px;
    }
    td.key {
      color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
      font-weight: 500;
      width: 35%;
    }
    td.value {
      color: var(--vscode-symbolIcon-stringForeground, #ce9178);
    }
  }
`;

interface HistoryDetailsModalProps {
  entry: HistoryEntry;
  onClose: () => void;
}

const HistoryDetailsModal: React.FC<HistoryDetailsModalProps> = ({ entry, onClose }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'headers'>('request');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleCopyCurl = () => {
    try {
      const { har, unhash } = buildHarRequest({
        request: {
          url: entry.request.url,
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
      setCopiedCurl(true);
      toast.success('cURL copied to clipboard');
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      toast.error('Failed to generate cURL command');
    }
  };

  const formatPayload = (data: unknown) => {
    if (data === null || data === undefined) return 'No body content';
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  const headersList = Array.isArray(entry.request.headers)
    ? entry.request.headers
    : Object.entries(entry.request.headers || {}).map(([name, value]) => ({ name, value }));

  return (
    <Modal
      size="lg"
      title={`Request Details: ${entry.request.method} ${decodeVariableBraces(entry.request.url)}`}
      handleCancel={onClose}
      hideFooter="true"
    >
      <StyledModalContent>
        <div className="meta-grid">
          <div className="meta-item">
            <span className="label">Method</span>
            <span className="val">{entry.request.method}</span>
          </div>
          <div className="meta-item">
            <span className="label">Status</span>
            <span className="val">{entry.response?.status ? `${entry.response.status} ${entry.response.statusText || ''}` : (entry.response?.error || 'No response')}</span>
          </div>
          <div className="meta-item">
            <span className="label">Duration</span>
            <span className="val">{entry.response?.duration ? `${entry.response.duration} ms` : '-'}</span>
          </div>
          <div className="meta-item">
            <span className="label">Size</span>
            <span className="val">{entry.response?.size ? `${(entry.response.size / 1024).toFixed(2)} KB` : '-'}</span>
          </div>
          <div className="meta-item">
            <span className="label">Timestamp</span>
            <span className="val">{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
              onClick={() => setActiveTab('request')}
            >
              Request Body
            </button>
            <button
              className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers ({headersList.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'response' ? 'active' : ''}`}
              onClick={() => setActiveTab('response')}
            >
              Response Payload
            </button>
          </div>

          <button
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary text-secondary hover:opacity-80"
            onClick={handleCopyCurl}
          >
            {copiedCurl ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copiedCurl ? 'Copied' : 'Copy cURL'}
          </button>
        </div>

        {activeTab === 'request' && (
          <div className="code-block">
            {formatPayload(entry.request.body?.json || entry.request.body?.text || entry.request.body)}
          </div>
        )}

        {activeTab === 'headers' && (
          <div>
            {headersList.length > 0 ? (
              <table className="kv-table">
                <thead>
                  <tr>
                    <th>Header Name</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {headersList.map((h: any, i: number) => (
                    <tr key={i}>
                      <td className="key">{h.name}</td>
                      <td className="value">{String(h.value ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-xs text-muted py-4 text-center">No headers sent</div>
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="code-block">
            {entry.response?.error
              ? `Error: ${entry.response.error}`
              : formatPayload(entry.response?.data)}
          </div>
        )}
      </StyledModalContent>
    </Modal>
  );
};

export default HistoryDetailsModal;
