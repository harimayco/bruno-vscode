import { describe, it, expect } from 'vitest';
import { isPostmanBackup, convertPostmanDumpToBruno } from './postman-backup';

describe('Postman Backup Importer', () => {
  const sampleDump = {
    version: 1,
    collections: [
      {
        id: '8fe3985f-939f-43ae-8207-25b50c4bd602',
        name: 'penipu',
        description: null,
        auth: null,
        events: null,
        variables: [],
        order: ['469d4b6d-e0d7-4057-bff0-ab030d9dbc1d'],
        folders_order: [],
        folders: [],
        requests: [
          {
            id: '469d4b6d-e0d7-4057-bff0-ab030d9dbc1d',
            name: 'bom',
            url: 'https://api.telegram.org/bot7826499609:AAF2zq8fSFiebzPjppG_Uy4ZtQtO8M1TK_I/sendMessage?chat_id=6972222540&text=penipu dongok kalo mau nipu pinteran dikit&parse_mode=html',
            method: 'POST',
            headerData: [
              { key: 'accept', value: '*/*', enabled: true },
              { key: 'content-length', value: '0', enabled: true }
            ],
            queryParams: [
              { key: 'chat_id', value: '6972222540', equals: true, enabled: true },
              { key: 'text', value: 'penipu dongok kalo mau nipu pinteran dikit', equals: true, enabled: true }
            ],
            dataMode: null,
            data: null
          }
        ]
      },
      {
        id: 'f079257a-ee43-4b47-a81e-254fbfef9575',
        name: 'FLOW',
        description: null,
        auth: null,
        events: null,
        variables: [],
        order: ['c5db8d37-b9cf-4ece-b047-33dab7617f64'],
        folders_order: [],
        folders: [],
        requests: [
          {
            id: 'c5db8d37-b9cf-4ece-b047-33dab7617f64',
            name: 'https://nettixflow.com/api/nettixflow/session/lease',
            url: 'https://nettixflow.com/api/nettixflow/session/lease',
            method: 'POST',
            dataMode: 'raw',
            rawModeData: '{"device_id":"nf-ultra-0ccd08b2"}',
            headerData: [
              { key: 'content-type', value: 'application/json', enabled: true }
            ],
            queryParams: []
          }
        ]
      }
    ],
    environments: [
      {
        id: '519db075-a296-4892-a248-5ef91e250d58',
        name: 'mslead prod',
        values: [
          { key: 'mslead_base_url', value: 'https://www.mslead.prod', type: 'default', enabled: true },
          { key: 'apikey', value: '123456', type: 'default', enabled: true }
        ]
      },
      {
        id: 'd7108f0c-8cd8-4a7b-ac79-bfb563e79196',
        name: 'mslead dev',
        values: [
          { key: 'mslead_base_url', value: 'https://www.mslead.dev', type: 'default', enabled: true }
        ]
      }
    ],
    headerPresets: [],
    globals: []
  };

  it('detects Postman backup format correctly', () => {
    expect(isPostmanBackup(sampleDump)).toBe(true);
    expect(isPostmanBackup({ info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' } })).toBe(false);
    expect(isPostmanBackup(null)).toBe(false);
  });

  it('converts multiple collections and environments accurately', () => {
    const result = convertPostmanDumpToBruno(sampleDump);

    expect(result.collections.length).toBe(2);
    expect(result.summary.collectionCount).toBe(2);
    expect(result.summary.collectionNames).toEqual(['penipu', 'FLOW']);

    // Check collection 1 ('penipu')
    const col1 = result.collections[0];
    expect(col1.name).toBe('penipu');
    expect(col1.items.length).toBe(1);
    expect(col1.items[0].name).toBe('bom');
    expect(col1.items[0].request.method).toBe('POST');
    expect(col1.items[0].request.params.length).toBe(2);
    expect(col1.items[0].request.params[0].name).toBe('chat_id');
    expect(col1.items[0].request.headers.length).toBe(2);

    // Check collection 2 ('FLOW')
    const col2 = result.collections[1];
    expect(col2.name).toBe('FLOW');
    expect(col2.items[0].request.body.mode).toBe('json');
    expect(col2.items[0].request.body.json).toBe('{"device_id":"nf-ultra-0ccd08b2"}');

    // Check environments
    expect(result.environments.length).toBe(2);
    expect(result.environments[0].name).toBe('mslead prod');
    expect(result.environments[0].variables.length).toBe(2);
    expect(result.environments[0].variables[0]).toMatchObject({
      name: 'mslead_base_url',
      value: 'https://www.mslead.prod',
      enabled: true
    });

    // Environments are embedded into each collection for immediate persistence
    expect(col1.environments.length).toBe(2);
    expect(col2.environments.length).toBe(2);
  });

  it('handles nested folders in Postman dump', () => {
    const dumpWithFolders = {
      version: 1,
      collections: [
        {
          name: 'API with Folders',
          order: ['req-root'],
          folders_order: ['folder-1'],
          folders: [
            {
              id: 'folder-1',
              name: 'Auth Folder',
              order: ['req-sub'],
              folders_order: []
            }
          ],
          requests: [
            { id: 'req-root', name: 'Root Req', url: 'https://api.com/root', method: 'GET', folder: null },
            { id: 'req-sub', name: 'Sub Req', url: 'https://api.com/sub', method: 'POST', folder: 'folder-1' }
          ]
        }
      ],
      environments: []
    };

    const result = convertPostmanDumpToBruno(dumpWithFolders);
    const col = result.collections[0];
    expect(col.items.length).toBe(2);

    // First item is folder
    const folder = col.items.find((i: any) => i.type === 'folder');
    expect(folder).toBeDefined();
    expect(folder.name).toBe('Auth Folder');
    expect(folder.items.length).toBe(1);
    expect(folder.items[0].name).toBe('Sub Req');

    // Second item is root request
    const rootReq = col.items.find((i: any) => i.type === 'http-request');
    expect(rootReq).toBeDefined();
    expect(rootReq.name).toBe('Root Req');
  });
});
