import * as path from 'path';
import * as vscode from 'vscode';
import { WebviewHelper } from '../webview/helper';
import { stateManager } from '../webview/state-manager';
import {
  setCurrentWebview,
  clearCurrentWebview,
  handleInvoke,
  hasHandler
} from '../ipc/handlers';
import { storeTransientItem } from './transient-request-panel';
import { findCollectionRoot } from '../utils/path';
import { ensureBrunoEditorIntent, setPendingNotLoadedRequest } from '../editors/bruno-editor-provider';

interface IpcMessage {
  type: 'invoke' | 'send';
  channel: string;
  args?: unknown[];
  requestId?: string;
}

let activeGlobalHistoryPanel: vscode.WebviewPanel | undefined;

export async function openGlobalHistoryPanel(
  context: vscode.ExtensionContext
): Promise<void> {
  if (activeGlobalHistoryPanel) {
    activeGlobalHistoryPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'bruno.globalHistory',
    'History',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri],
      retainContextWhenHidden: true
    }
  );

  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'bruno-icon.png');
  activeGlobalHistoryPanel = panel;

  panel.webview.html = WebviewHelper.getHtmlForWebview(panel.webview, context.extensionUri);
  stateManager.addWebview(panel.webview);

  panel.onDidDispose(() => {
    activeGlobalHistoryPanel = undefined;
    stateManager.removeWebview(panel.webview);
  });

  panel.webview.onDidReceiveMessage(async (message: IpcMessage) => {
    const { type, channel, args, requestId } = message;

    if (type === 'invoke' && requestId) {
      setCurrentWebview(panel.webview);

      try {
        let result: unknown;

        if (hasHandler(channel)) {
          result = await handleInvoke(channel, args || []);
        } else {
          result = null;
        }

        panel.webview.postMessage({
          type: 'response',
          requestId,
          result
        });

        if (channel === 'renderer:ready') {
          stateManager.sendTo(panel.webview, 'main:set-view', {
            viewType: 'global-history'
          });
          clearCurrentWebview();
          return;
        }
      } catch (error) {
        panel.webview.postMessage({
          type: 'response',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        clearCurrentWebview();
      }
    } else if (type === 'send') {
      setCurrentWebview(panel.webview);
      try {
        if (channel === 'open-external' && typeof args?.[0] === 'string') {
          vscode.env.openExternal(vscode.Uri.parse(args[0]));
        }

        if (channel === 'sidebar:open-request' && typeof args?.[0] === 'string') {
          const requestPath = vscode.Uri.file(args[0]).fsPath;
          if (requestPath.includes('.bruno/transient') || requestPath.includes('.bruno\\transient')) {
            return;
          }
          const basename = path.basename(requestPath);
          if (basename === 'opencollection.yml' || basename === 'collection.bru') {
            const rootOfFile = findCollectionRoot(requestPath);
            const parentRoot = rootOfFile ? findCollectionRoot(rootOfFile) : null;
            if (parentRoot) {
              await ensureBrunoEditorIntent(requestPath, 'not-loaded');
              setPendingNotLoadedRequest(requestPath, parentRoot);
            }
          }
          await vscode.commands.executeCommand(
            'vscode.openWith',
            vscode.Uri.file(requestPath),
            'bruno.requestEditor'
          );
        }

        if (channel === 'sidebar:open-app' && typeof args?.[0] === 'string') {
          await vscode.commands.executeCommand(
            'vscode.openWith',
            vscode.Uri.file(args[0]),
            'bruno.requestEditor'
          );
        }

        if (channel === 'sidebar:open-transient-request' && args?.[0] && typeof args[0] === 'object') {
          const { itemUid, itemName, collectionUid, collectionPath: transientCollPath, item: transientItem } = args[0] as {
            itemUid?: string;
            itemName?: string;
            collectionUid?: string;
            collectionPath?: string;
            item?: Record<string, unknown>;
          };
          if (itemUid && collectionUid && transientCollPath) {
            if (transientItem) {
              storeTransientItem(itemUid, transientItem);
            }
            await vscode.commands.executeCommand(
              'bruno.openTransientRequest',
              itemUid,
              itemName || 'Untitled',
              collectionUid,
              transientCollPath
            );
          }
        }

        if (channel === 'sidebar:open-global-environments') {
          await vscode.commands.executeCommand('bruno.openGlobalEnvironments');
        }

        if (channel === 'sidebar:open-global-history') {
          await vscode.commands.executeCommand('bruno.openGlobalHistory');
        }

        if (channel === 'sidebar:open-create-collection') {
          await vscode.commands.executeCommand('bruno.openCreateCollection');
        }

        if (channel === 'sidebar:open-import-collection') {
          await vscode.commands.executeCommand('bruno.importCollection');
        }
      } finally {
        clearCurrentWebview();
      }
    }
  });

  // Send view data immediately — the IPC event queue buffers it until React mounts.
  stateManager.sendTo(panel.webview, 'main:set-view', {
    viewType: 'global-history'
  });
}

export function getActiveGlobalHistoryPanel(): vscode.WebviewPanel | undefined {
  return activeGlobalHistoryPanel;
}
