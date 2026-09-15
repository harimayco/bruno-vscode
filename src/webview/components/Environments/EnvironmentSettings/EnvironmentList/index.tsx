import React, { useEffect, useState, useRef, useMemo } from 'react';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from 'components/Environments/EnvironmentSettings/CreateEnvironment';
import { IconDownload, IconUpload, IconSearch, IconPlus, IconCheck, IconX, IconTrash } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import ConfirmSwitchEnv from 'components/Environments/ConfirmSwitchEnv';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';
import { isEqual } from 'lodash';
import { useDispatch } from 'react-redux';
import { addEnvironment, renameEnvironment, selectEnvironment, deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment, renameGlobalEnvironment, selectGlobalEnvironment, deleteGlobalEnvironment, deleteGlobalEnvironments } from 'providers/ReduxStore/slices/global-environments';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';

interface EnvironmentListProps {
  environments: unknown[];
  activeEnvironmentUid?: boolean;
  selectedEnvironment?: React.ReactNode;
  setSelectedEnvironment?: (...args: unknown[]) => unknown;
  isModified?: boolean;
  setIsModified?: boolean;
  collection?: React.ReactNode;
  setShowExportModal?: boolean;
  isGlobal?: boolean;
}


const EnvironmentList = ({
  environments,
  activeEnvironmentUid,
  selectedEnvironment,
  setSelectedEnvironment,
  isModified,
  setIsModified,
  collection,
  setShowExportModal,
  isGlobal
}: any) => {
  const dispatch = useDispatch();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [renamingEnvUid, setRenamingEnvUid] = useState<string | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [envNameError, setEnvNameError] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedEnvUids, setSelectedEnvUids] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameContainerRef = useRef<HTMLDivElement>(null);
  const createContainerRef = useRef<HTMLDivElement>(null);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [originalEnvironmentVariables, setOriginalEnvironmentVariables] = useState<any[]>([]);

  const envUids = environments ? environments.map((env: any) => env.uid) : [];
  const prevEnvUids = usePrevious(envUids);

  useEffect(() => {
    if (!environments?.length) {
      setSelectedEnvironment(null);
      setOriginalEnvironmentVariables([]);
      return;
    }

    if (selectedEnvironment) {
      let _selectedEnvironment = environments?.find((env: any) => env?.uid === selectedEnvironment?.uid);

      if (!_selectedEnvironment) {
        _selectedEnvironment = environments?.find((env: any) => env?.name === selectedEnvironment?.name);
      }

      if (!_selectedEnvironment) {
        _selectedEnvironment = environments?.find((env: any) => env.uid === activeEnvironmentUid) || environments?.[0];
      }

      const hasSelectedEnvironmentChanged = !isEqual(selectedEnvironment, _selectedEnvironment);
      if (hasSelectedEnvironmentChanged || selectedEnvironment.uid !== _selectedEnvironment?.uid) {
        setSelectedEnvironment(_selectedEnvironment);
      }
      setOriginalEnvironmentVariables(_selectedEnvironment?.variables || []);
      return;
    }

    const environment = environments?.find((env: any) => env.uid === activeEnvironmentUid) || environments?.[0];

    setSelectedEnvironment(environment);
    setOriginalEnvironmentVariables(environment?.variables || []);
  }, [environments, activeEnvironmentUid, selectedEnvironment]);

  useEffect(() => {
    if (prevEnvUids && prevEnvUids.length && envUids.length > prevEnvUids.length) {
      const newEnv = environments.find((env: any) => !prevEnvUids.includes(env.uid));
      if (newEnv) {
        setSelectedEnvironment(newEnv);
      }
    }

    if (prevEnvUids && prevEnvUids.length && envUids.length < prevEnvUids.length) {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [envUids, environments, prevEnvUids]);

  useEffect(() => {
    if (!renamingEnvUid) return;

    const handleClickOutside = (event: any) => {
      if (renameContainerRef.current && !renameContainerRef.current.contains(event.target)) {
        handleCancelRename();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [renamingEnvUid]);

  useEffect(() => {
    if (!isCreatingInline) return;

    const handleClickOutside = (event: any) => {
      if (createContainerRef.current && !createContainerRef.current.contains(event.target)) {
        handleCancelCreate();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreatingInline]);

  const handleEnvironmentClick = (env: any) => {
    if (!isModified) {
      setSelectedEnvironment(env);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleEnvironmentDoubleClick = (env: any) => {
    setRenamingEnvUid(env.uid);
    setNewEnvName(env.name);
    setEnvNameError('');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleActivateEnvironment = (e: any, env: any) => {
    e.stopPropagation();
    const action = isGlobal
      ? selectGlobalEnvironment({ environmentUid: env.uid })
      : selectEnvironment(env.uid, collection.uid);
    (dispatch(action) as unknown as Promise<void>)
      .then(() => {
        toast.success(`Environment "${env.name}" activated`);
      })
      .catch(() => {
        toast.error('Failed to activate environment');
      });
  };

  if (!selectedEnvironment) {
    return null;
  }

  const validateEnvironmentName = (name: any, excludeUid: string | null = null) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (!validateName(name)) {
      return validateNameError(name);
    }

    const trimmedName = name.toLowerCase().trim();
    const isDuplicate = environments.some(
      (env: any) => env?.uid !== excludeUid && env?.name?.toLowerCase().trim() === trimmedName
    );
    if (isDuplicate) {
      return 'Environment already exists';
    }

    return null;
  };

  const handleCreateEnvClick = () => {
    if (!isModified) {
      setIsCreatingInline(true);
      setNewEnvName('');
      setEnvNameError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingInline(false);
    setNewEnvName('');
    setEnvNameError('');
  };

  const handleSaveNewEnv = () => {
    const error = validateEnvironmentName(newEnvName);
    if (error) {
      setEnvNameError(error);
      return;
    }

    const action = isGlobal
      ? addGlobalEnvironment({ name: newEnvName })
      : addEnvironment(newEnvName, collection.uid);
    (dispatch(action) as unknown as Promise<void>)
      .then(() => {
        toast.success(isGlobal ? 'Global environment created!' : 'Environment created!');
        setIsCreatingInline(false);
        setNewEnvName('');
        setEnvNameError('');
      })
      .catch(() => {
        toast.error('An error occurred while creating the environment');
      });
  };

  const handleEnvNameChange = (e: any) => {
    const value = e.target.value;
    setNewEnvName(value);

    if (envNameError) {
      setEnvNameError('');
    }
  };

  const handleEnvNameKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (renamingEnvUid) {
        handleSaveRename();
      } else {
        handleSaveNewEnv();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (renamingEnvUid) {
        handleCancelRename();
      } else {
        handleCancelCreate();
      }
    }
  };

  const handleSaveRename = () => {
    const error = validateEnvironmentName(newEnvName, renamingEnvUid);
    if (error) {
      setEnvNameError(error);
      return;
    }

    const action = isGlobal
      ? renameGlobalEnvironment({ name: newEnvName, environmentUid: renamingEnvUid })
      : renameEnvironment(newEnvName, renamingEnvUid, collection.uid);
    (dispatch(action) as unknown as Promise<void>)
      .then(() => {
        toast.success('Environment renamed!');
        setRenamingEnvUid(null);
        setNewEnvName('');
        setEnvNameError('');
      })
      .catch(() => {
        toast.error('An error occurred while renaming the environment');
      });
  };

  const handleCancelRename = () => {
    setRenamingEnvUid(null);
    setNewEnvName('');
    setEnvNameError('');
  };

  const handleImportClick = () => {
    if (!isModified) {
      setOpenImportModal(true);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleExportClick = () => {
    if (setShowExportModal) {
      setShowExportModal(true);
    }
  };

  const handleConfirmSwitch = (saveChanges: any) => {
    if (!saveChanges) {
      setSwitchEnvConfirmClose(false);
    }
  };

  const toggleBulkMode = () => {
    if (isBulkMode) {
      setIsBulkMode(false);
      setSelectedEnvUids([]);
    } else {
      setIsBulkMode(true);
      setSelectedEnvUids([]);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEnvUids(filteredEnvironments.map((env: any) => env.uid));
    } else {
      setSelectedEnvUids([]);
    }
  };

  const toggleSelectEnv = (envUid: string) => {
    setSelectedEnvUids((prev) =>
      prev.includes(envUid) ? prev.filter((id) => id !== envUid) : [...prev, envUid]
    );
  };

  const handleConfirmBulkDelete = async () => {
    const uidsToDelete = [...selectedEnvUids];
    if (!uidsToDelete.length) return;

    setIsBulkDeleting(true);
    try {
      if (isGlobal) {
        await (dispatch(deleteGlobalEnvironments({ environmentUids: uidsToDelete }) as any));
      } else {
        await Promise.all(
          uidsToDelete.map((envUid) => dispatch(deleteEnvironment(envUid, collection.uid) as any))
        );
      }
      toast.success(`${uidsToDelete.length} environment(s) deleted successfully`);
      setSelectedEnvUids([]);
      setIsBulkMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      toast.error('An error occurred while deleting environments');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const sortedEnvironments = useMemo(() => {
    if (!environments || !Array.isArray(environments)) return [];
    return [...environments].sort((a: any, b: any) =>
      (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
  }, [environments]);

  const filteredEnvironments = useMemo(() => {
    return sortedEnvironments.filter((env: any) =>
      env.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [sortedEnvironments, searchText]);

  const selectedEnvNames = useMemo(() => {
    return (environments || [])
      .filter((env: any) => selectedEnvUids.includes(env.uid))
      .map((env: any) => env.name || 'Untitled');
  }, [environments, selectedEnvUids]);

  return (
    <StyledWrapper>
      {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
      {openImportModal && (
        <ImportEnvironmentModal type={isGlobal ? 'global' : 'collection'} collection={collection} onClose={() => setOpenImportModal(false)} />
      )}

      {showBulkDeleteConfirm && (
        <Portal>
          <Modal
            size="sm"
            title="Delete Environments"
            confirmText={isBulkDeleting ? 'Deleting...' : `Delete (${selectedEnvUids.length})`}
            handleConfirm={handleConfirmBulkDelete}
            handleCancel={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
            confirmButtonColor="danger"
            disableConfirm={isBulkDeleting}
          >
            <div>
              <p style={{ marginBottom: 10 }}>
                Are you sure you want to delete <strong>{selectedEnvUids.length}</strong> selected environment(s)? This action cannot be undone.
              </p>
              <div style={{
                maxHeight: 140,
                overflowY: 'auto',
                background: 'var(--vscode-editor-inactiveSelectionBackground, rgba(255,255,255,0.05))',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12
              }}>
                {selectedEnvNames.map((name: string, i: number) => (
                  <div key={i} style={{ padding: '2px 0' }}>• {name}</div>
                ))}
              </div>
            </div>
          </Modal>
        </Portal>
      )}

      <div className="environments-container">
        {switchEnvConfirmClose && (
          <div className="confirm-switch-overlay">
            <ConfirmSwitchEnv onCancel={() => handleConfirmSwitch(false)} />
          </div>
        )}

        <div className="sidebar">
          <div className="sidebar-header">
            <h2 className="title">Environments</h2>
            <div className="flex items-center gap-2">
              <button className="btn-action" onClick={() => handleCreateEnvClick()} title="Create environment" disabled={isBulkMode}>
                <IconPlus size={16} strokeWidth={1.5} />
              </button>
              <button className="btn-action" onClick={() => handleImportClick()} title="Import environment" disabled={isBulkMode}>
                <IconDownload size={16} strokeWidth={1.5} />
              </button>
              <button className="btn-action" onClick={() => handleExportClick()} title="Export environment" disabled={isBulkMode}>
                <IconUpload size={16} strokeWidth={1.5} />
              </button>
              <button
                className={`btn-action ${isBulkMode ? 'active' : ''}`}
                onClick={toggleBulkMode}
                title={isBulkMode ? 'Exit selection mode' : 'Bulk delete environments'}
                style={isBulkMode ? { color: 'var(--vscode-errorForeground, #f14c4c)' } : {}}
              >
                <IconTrash size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="search-container">
            <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
            <input
              type="text"
              placeholder="Search environments..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
          </div>

          {isBulkMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              margin: '0 8px 6px 8px',
              background: 'var(--vscode-editor-inactiveSelectionBackground, rgba(255,255,255,0.06))',
              borderRadius: 4,
              fontSize: 12
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={filteredEnvironments.length > 0 && selectedEnvUids.length === filteredEnvironments.length}
                  onChange={handleSelectAll}
                />
                <span>Select All ({selectedEnvUids.length})</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={selectedEnvUids.length === 0}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  style={{
                    padding: '2px 8px',
                    background: selectedEnvUids.length > 0 ? 'var(--vscode-errorForeground, #f14c4c)' : 'transparent',
                    color: selectedEnvUids.length > 0 ? '#ffffff' : 'var(--vscode-disabledForeground, #666)',
                    border: 'none',
                    borderRadius: 3,
                    cursor: selectedEnvUids.length > 0 ? 'pointer' : 'not-allowed',
                    fontSize: 11,
                    fontWeight: 500
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setIsBulkMode(false);
                    setSelectedEnvUids([]);
                  }}
                  style={{
                    padding: '2px 8px',
                    background: 'transparent',
                    color: 'var(--vscode-foreground, #cccccc)',
                    border: '1px solid var(--vscode-widget-border, rgba(255,255,255,0.2))',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="environments-list">
            {filteredEnvironments.map((env: any) => <div
              key={env.uid}
              id={env.uid}
              className={`environment-item ${selectedEnvironment?.uid === env.uid ? 'active' : ''} ${renamingEnvUid === env.uid ? 'renaming' : ''} ${activeEnvironmentUid === env.uid ? 'activated' : ''}`}
              onClick={() => {
                if (isBulkMode) {
                  toggleSelectEnv(env.uid);
                } else if (renamingEnvUid !== env.uid) {
                  handleEnvironmentClick(env);
                }
              }}
              onDoubleClick={() => !isBulkMode && handleEnvironmentDoubleClick(env)}
            >
              {isBulkMode && (
                <input
                  type="checkbox"
                  checked={selectedEnvUids.includes(env.uid)}
                  onChange={() => toggleSelectEnv(env.uid)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginRight: 8, cursor: 'pointer' }}
                />
              )}
              {renamingEnvUid === env.uid ? (
                <div className="rename-container" ref={renameContainerRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    className="environment-name-input"
                    value={newEnvName}
                    onChange={handleEnvNameChange}
                    onKeyDown={handleEnvNameKeyDown}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <div className="inline-actions">
                    <button
                      className="inline-action-btn save"
                      onClick={handleSaveRename}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Save"
                    >
                      <IconCheck size={14} strokeWidth={2} />
                    </button>
                    <button
                      className="inline-action-btn cancel"
                      onClick={handleCancelRename}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Cancel"
                    >
                      <IconX size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="environment-name">{env.name}</span>
                  {!isBulkMode && (
                    <div className="environment-actions">
                      {activeEnvironmentUid === env.uid ? (
                        <div className="activated-checkmark" title="Active environment">
                          <IconCheck size={16} strokeWidth={2} />
                        </div>
                      ) : (
                        <button
                          className="activate-btn"
                          onClick={(e) => handleActivateEnvironment(e, env)}
                          title="Activate environment"
                        >
                          <IconCheck size={16} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>)}

            {isCreatingInline && (
              <div className="environment-item creating" ref={createContainerRef}>
                <input
                  ref={inputRef}
                  type="text"
                  className="environment-name-input"
                  value={newEnvName}
                  onChange={handleEnvNameChange}
                  onKeyDown={handleEnvNameKeyDown}
                  placeholder="Environment name..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <div className="inline-actions">
                  <button
                    className="inline-action-btn save"
                    onClick={handleSaveNewEnv}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Save"
                  >
                    <IconCheck size={14} strokeWidth={2} />
                  </button>
                  <button
                    className="inline-action-btn cancel"
                    onClick={handleCancelCreate}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Cancel"
                  >
                    <IconX size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {envNameError && (isCreatingInline || renamingEnvUid) && <div className="env-error">{envNameError}</div>}
          </div>
        </div>

        <EnvironmentDetails
          environment={selectedEnvironment}
          setIsModified={setIsModified}
          originalEnvironmentVariables={originalEnvironmentVariables}
          collection={collection}
          isGlobal={isGlobal}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
