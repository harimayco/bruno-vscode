import React, { useState } from 'react';
import styled from 'styled-components';
import Modal from 'components/Modal';
import { HistoryEntry } from '@bruno-types';
import { useDispatch, useSelector } from 'react-redux';
import { newHttpRequest } from 'providers/ReduxStore/slices/collections/actions';
import { decodeVariableBraces } from 'utils/common';
import toast from 'react-hot-toast';

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-editor-foreground, #ffffff);
    }

    input, select {
      height: 32px;
      padding: 4px 10px;
      background-color: var(--vscode-input-background, #252526);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 12px;
      outline: none;

      &:focus {
        border-color: var(--vscode-focusBorder, #007acc);
      }
    }
  }
`;

interface SaveToCollectionModalProps {
  entry: HistoryEntry;
  onClose: () => void;
}

const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({ entry, onClose }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state: any) => state.collections.collections || []);

  const defaultCollectionUid = entry.source?.collectionUid || collections[0]?.uid || '';
  const [selectedCollectionUid, setSelectedCollectionUid] = useState<string>(defaultCollectionUid);

  const decodedUrl = decodeVariableBraces(entry.request.url || '');
  const defaultName = entry.source?.itemName
    || (decodedUrl ? decodedUrl.split('?')[0].split('/').filter(Boolean).pop() || 'Request' : 'Request');
  const [requestName, setRequestName] = useState<string>(defaultName);

  const handleSave = async () => {
    if (!selectedCollectionUid) {
      toast.error('Please select a collection');
      return;
    }
    if (!requestName.trim()) {
      toast.error('Please enter a request name');
      return;
    }

    const targetCollection = collections.find((c: any) => c.uid === selectedCollectionUid);
    const ext = targetCollection?.format === 'yml' ? 'yml' : 'bru';
    const trimmedName = requestName.trim();
    const filename = `${trimmedName}.${ext}`;

    try {
      await dispatch(
        newHttpRequest({
          requestName: trimmedName,
          filename,
          requestType: 'http-request',
          requestUrl: decodedUrl,
          requestMethod: entry.request.method,
          collectionUid: selectedCollectionUid,
          itemUid: null,
          headers: Array.isArray(entry.request.headers) ? entry.request.headers : [],
          body: entry.request.body || { mode: 'none' }
        }) as any
      );
      toast.success(`Saved "${requestName.trim()}" to collection`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save request to collection');
    }
  };

  return (
    <Modal
      title="Save to Collection"
      confirmText="Save Request"
      handleSubmit={handleSave}
      handleCancel={onClose}
    >
      <StyledModalContent>
        <div className="form-group">
          <label>Target Collection</label>
          <select
            value={selectedCollectionUid}
            onChange={(e) => setSelectedCollectionUid(e.target.value)}
          >
            {collections.map((c: any) => (
              <option key={c.uid} value={c.uid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Request Name</label>
          <input
            type="text"
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="e.g. Get User Profile"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>URL</label>
          <input
            type="text"
            value={`${entry.request.method} ${entry.request.url}`}
            disabled
            style={{ opacity: 0.7 }}
          />
        </div>
      </StyledModalContent>
    </Modal>
  );
};

export default SaveToCollectionModal;
