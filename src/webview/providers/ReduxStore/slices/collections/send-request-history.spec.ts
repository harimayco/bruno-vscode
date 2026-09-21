import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('utils/ipc', () => ({
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue([]),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

import { sendRequest } from './actions';

describe('sendRequest - Global History Recording', () => {
  let dispatch: any;
  let dispatchedActions: any[];
  let invokeMock: any;

  beforeEach(() => {
    dispatchedActions = [];
    dispatch = vi.fn((action) => {
      if (typeof action === 'function') {
        return action(dispatch, () => ({}));
      }
      dispatchedActions.push(action);
      return Promise.resolve(action);
    });

    invokeMock = vi.fn();
    vi.stubGlobal('window', {
      ipcRenderer: {
        invoke: invokeMock,
        send: vi.fn(),
        on: vi.fn(),
        removeAllListeners: vi.fn()
      },
      promptForVariables: vi.fn().mockResolvedValue({})
    });
  });

  it('records real unsaved draft request data to history instead of saved disk data', async () => {
    const savedRequest = {
      url: 'https://api.example.com/saved-endpoint',
      method: 'GET',
      headers: [{ name: 'X-Saved', value: '1', enabled: true }],
      params: [{ name: 'savedParam', value: 'true', enabled: true }],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    };

    const draftRequest = {
      url: 'https://api.example.com/unsaved-endpoint',
      method: 'POST',
      headers: [{ name: 'X-Unsaved', value: '2', enabled: true }],
      params: [{ name: 'unsavedParam', value: 'yes', enabled: true }],
      body: { mode: 'json', json: '{"unsavedKey":"unsavedVal"}' },
      auth: { mode: 'bearer', bearer: { token: 'secret-token' } }
    };

    const item: any = {
      uid: 'item-1',
      name: 'Test Request',
      type: 'http-request',
      request: savedRequest,
      draft: {
        request: draftRequest
      }
    };

    const collection: any = {
      uid: 'col-1',
      name: 'Test Collection',
      pathname: '/path/to/collection',
      items: [item],
      runtimeVariables: {}
    };

    const getState = () => ({
      globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
      collections: { collections: [collection] },
      tabs: { activeTabUid: 'item-1' }
    });

    invokeMock.mockImplementation((channel: string) => {
      if (channel === 'send-http-request') {
        return Promise.resolve({
          status: 200,
          statusText: 'OK',
          duration: 150,
          size: 200,
          headers: { 'content-type': 'application/json' },
          data: { success: true },
          requestSent: {
            url: 'https://api.example.com/unsaved-endpoint',
            method: 'POST',
            headers: { 'x-unsaved': '2', 'content-type': 'application/json' }
          }
        });
      }
      return Promise.resolve({});
    });

    await sendRequest(item, 'col-1')(dispatch, getState);

    // Look for addHistoryEntry dispatched action
    const historyAction = dispatchedActions.find((a) => a?.type === 'history/addHistoryEntry');
    expect(historyAction).toBeDefined();

    const entry = historyAction.payload;
    expect(entry.request.url).toBe('https://api.example.com/unsaved-endpoint');
    expect(entry.request.method).toBe('POST');
    expect(entry.request.body).toEqual({ mode: 'json', json: '{"unsavedKey":"unsavedVal"}' });
    expect(entry.request.params).toEqual([{ name: 'unsavedParam', value: 'yes', enabled: true }]);
    expect(entry.request.auth).toEqual({ mode: 'bearer', bearer: { token: 'secret-token' } });
  });

  it('records saved request data to history when no draft changes exist', async () => {
    const savedRequest = {
      url: 'https://api.example.com/persisted-endpoint',
      method: 'GET',
      headers: [{ name: 'X-Header', value: 'abc', enabled: true }],
      params: [{ name: 'limit', value: '10', enabled: true }],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    };

    const item: any = {
      uid: 'item-2',
      name: 'Saved Request',
      type: 'http-request',
      request: savedRequest,
      draft: null
    };

    const collection: any = {
      uid: 'col-2',
      name: 'Test Collection 2',
      pathname: '/path/to/col2',
      items: [item],
      runtimeVariables: {}
    };

    const getState = () => ({
      globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
      collections: { collections: [collection] },
      tabs: { activeTabUid: 'item-2' }
    });

    invokeMock.mockImplementation((channel: string) => {
      if (channel === 'send-http-request') {
        return Promise.resolve({
          status: 200,
          statusText: 'OK',
          duration: 80,
          size: 100,
          headers: { 'content-type': 'application/json' },
          data: { ok: true },
          requestSent: {
            url: 'https://api.example.com/persisted-endpoint',
            method: 'GET',
            headers: { 'x-header': 'abc' }
          }
        });
      }
      return Promise.resolve({});
    });

    await sendRequest(item, 'col-2')(dispatch, getState);

    const historyAction = dispatchedActions.find((a) => a?.type === 'history/addHistoryEntry');
    expect(historyAction).toBeDefined();

    const entry = historyAction.payload;
    expect(entry.request.url).toBe('https://api.example.com/persisted-endpoint');
    expect(entry.request.method).toBe('GET');
    expect(entry.request.body).toEqual({ mode: 'none' });
    expect(entry.request.params).toEqual([{ name: 'limit', value: '10', enabled: true }]);
  });

  it('records unsaved draft data in error history entry when request fails', async () => {
    const savedRequest = {
      url: 'https://api.example.com/old',
      method: 'GET',
      headers: [],
      params: [],
      body: { mode: 'none' },
      auth: {}
    };

    const draftRequest = {
      url: 'https://api.example.com/new-broken-url',
      method: 'PUT',
      headers: [{ name: 'X-Draft', value: 'val', enabled: true }],
      params: [{ name: 'foo', value: 'bar', enabled: true }],
      body: { mode: 'text', text: 'raw error payload' },
      auth: { mode: 'basic' }
    };

    const item: any = {
      uid: 'item-3',
      name: 'Failing Request',
      type: 'http-request',
      request: savedRequest,
      draft: {
        request: draftRequest
      }
    };

    const collection: any = {
      uid: 'col-3',
      name: 'Col 3',
      pathname: '/path/to/col3',
      items: [item],
      runtimeVariables: {}
    };

    const getState = () => ({
      globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
      collections: { collections: [collection] },
      tabs: { activeTabUid: 'item-3' }
    });

    invokeMock.mockImplementation((channel: string) => {
      if (channel === 'send-http-request') {
        return Promise.reject(new Error('Network connection refused'));
      }
      return Promise.resolve({});
    });

    await sendRequest(item, 'col-3')(dispatch, getState);

    const historyAction = dispatchedActions.find((a) => a?.type === 'history/addHistoryEntry');
    expect(historyAction).toBeDefined();

    const entry = historyAction.payload;
    expect(entry.request.url).toBe('https://api.example.com/new-broken-url');
    expect(entry.request.method).toBe('PUT');
    expect(entry.request.body).toEqual({ mode: 'text', text: 'raw error payload' });
    expect(entry.request.params).toEqual([{ name: 'foo', value: 'bar', enabled: true }]);
    expect(entry.request.headers).toEqual([{ name: 'X-Draft', value: 'val', enabled: true }]);
    expect(entry.request.auth).toEqual({ mode: 'basic' });
    expect(entry.response.error).toBe('Network connection refused');
    expect(entry.response.statusText).toBe('Error');
  });
});
