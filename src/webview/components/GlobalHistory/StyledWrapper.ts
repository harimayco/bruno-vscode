import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--vscode-editor-background, ${(props) => props.theme?.background || '#1e1e1e'});
  color: var(--vscode-editor-foreground, ${(props) => props.theme?.text || '#cccccc'});
  overflow: hidden;

  .history-header {
    display: flex;
    flex-direction: column;
    padding: 12px 18px;
    gap: 10px;
    border-bottom: 1px solid var(--vscode-editorGroup-border, ${(props) => props.theme?.sidebar?.collection?.item?.hoverBg || '#2d2d2d'});
    flex-shrink: 0;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title-area {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-editor-foreground, #ffffff);
      margin: 0;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 7px;
      border-radius: 10px;
      background: var(--vscode-badge-background, #333333);
      color: var(--vscode-badge-foreground, #cccccc);
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .search-box-wrapper {
    flex: 1;
    min-width: 200px;
    max-width: 380px;
    position: relative;
    display: flex;
    align-items: center;

    .search-icon {
      position: absolute;
      left: 9px;
      color: var(--vscode-input-placeholderForeground, #888888);
      pointer-events: none;
    }

    .clear-search-btn {
      position: absolute;
      right: 8px;
      cursor: pointer;
      color: var(--vscode-input-placeholderForeground, #888888);
      &:hover {
        color: var(--vscode-editor-foreground, #ffffff);
      }
    }

    input {
      width: 100%;
      height: 28px;
      padding: 2px 26px 2px 28px;
      background-color: var(--vscode-input-background, #252526);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 12px;
      outline: none;

      &:focus {
        border-color: var(--vscode-focusBorder, #007acc);
      }

      &::placeholder {
        color: var(--vscode-input-placeholderForeground, #888888);
      }
    }
  }

  .pills-group {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
  }

  .filter-pill {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    background-color: var(--vscode-button-secondaryBackground, #2d2d2d);
    color: var(--vscode-button-secondaryForeground, #cccccc);
    border: 1px solid transparent;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
      background-color: var(--vscode-button-secondaryHoverBackground, #3a3a3a);
    }

    &.active {
      background-color: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
    }
  }

  .history-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 18px 24px;
  }

  .date-group {
    margin-bottom: 18px;

    .date-heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground, #888888);
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid var(--vscode-editorGroup-border, #2d2d2d);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Compact 1-Row History Item Card (Postman Style) */
  .history-item-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    padding: 0 10px;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s ease;
    position: relative;
    gap: 10px;
    user-select: none;

    .item-main {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .method-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      min-width: 44px;
      text-align: center;
      text-transform: uppercase;
      flex-shrink: 0;

      &.get {
        background-color: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
      &.post {
        background-color: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      &.put {
        background-color: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      &.delete {
        background-color: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      &.patch {
        background-color: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
      }
      &.options, &.head {
        background-color: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
        border: 1px solid rgba(156, 163, 175, 0.3);
      }
    }

    .url-text {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      color: var(--vscode-editor-foreground, #cccccc);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;

      .origin-hint {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #777777);
        margin-left: 8px;
        font-weight: normal;
      }
    }

    .item-metrics {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .status-pill {
        font-size: 10px;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;

        &.s-2xx {
          background-color: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
        &.s-3xx {
          background-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        &.s-4xx {
          background-color: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }
        &.s-5xx, &.s-err {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }
      }

      .metric-text {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #888888);
        min-width: 42px;
        text-align: right;
      }

      .time-text {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #777777);
        min-width: 50px;
        text-align: right;
        transition: opacity 0.12s ease;
      }
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s ease;

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 3px;
        background-color: transparent;
        color: var(--vscode-icon-foreground, #cccccc);
        border: none;
        cursor: pointer;
        transition: all 0.1s ease;

        &:hover {
          background-color: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.12));
          color: var(--vscode-editor-foreground, #ffffff);
        }

        &.delete-btn {
          &:hover {
            color: #f87171;
            background-color: rgba(239, 68, 68, 0.2);
          }
        }
      }
    }

    &:hover, &.has-menu-open {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      border-color: var(--vscode-list-hoverBackground, #333333);

      .item-metrics .time-text {
        opacity: 0;
      }

      .item-actions {
        opacity: 1;
        pointer-events: auto;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--vscode-descriptionForeground, #888888);

    .empty-icon {
      color: var(--vscode-descriptionForeground, #555555);
      margin-bottom: 12px;
    }

    .empty-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--vscode-editor-foreground, #ffffff);
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 12px;
      max-width: 380px;
      line-height: 1.5;
    }
  }
`;

export default StyledWrapper;
