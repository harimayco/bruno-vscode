import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';

export const isPostmanBackup = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  // Postman Data Dump format (e.g., Backup.postman_dump.json)
  const hasVersion = data.version === 1 || data.version === '1';
  const hasCollectionsArray = Array.isArray(data.collections);
  const hasPostmanDumpSections =
    Array.isArray(data.environments) ||
    Array.isArray(data.globals) ||
    Array.isArray(data.headerPresets);

  return hasVersion && hasCollectionsArray && hasPostmanDumpSections;
};

const convertPostmanV1Auth = (auth: any): any => {
  if (!auth || typeof auth !== 'object') {
    return { mode: 'none' };
  }

  const type = auth.type;
  if (type === 'basic' || auth.basic) {
    return {
      mode: 'basic',
      basic: {
        username: auth.basic?.username || '',
        password: auth.basic?.password || ''
      }
    };
  }

  if (type === 'bearer' || auth.bearer) {
    return {
      mode: 'bearer',
      bearer: {
        token: auth.bearer?.token || ''
      }
    };
  }

  if (type === 'apikey' || auth.apikey) {
    return {
      mode: 'apikey',
      apikey: {
        key: auth.apikey?.key || '',
        value: auth.apikey?.value || '',
        placement: auth.apikey?.in === 'query' ? 'query' : 'header'
      }
    };
  }

  if (type === 'oauth2' || auth.oauth2) {
    return {
      mode: 'oauth2',
      oauth2: auth.oauth2 || {}
    };
  }

  return { mode: 'inherit' };
};

const convertPostmanV1Body = (req: any): any => {
  const emptyBody: {
    mode: string;
    json: string | null;
    text: string | null;
    xml: string | null;
    formUrlEncoded: any[];
    multipartForm: any[];
    graphql?: any;
  } = {
    mode: 'none',
    json: null,
    text: null,
    xml: null,
    formUrlEncoded: [],
    multipartForm: []
  };

  const dataMode = req.dataMode;
  if (!dataMode || dataMode === 'none') {
    return emptyBody;
  }

  if (dataMode === 'raw') {
    const rawData = req.rawModeData || (typeof req.data === 'string' ? req.data : '');
    
    // Check if headers contain content-type or if text is valid JSON / XML
    const headersStr = (req.headers || '').toLowerCase();
    const isJsonHeader = (req.headerData || []).some((h: any) =>
      (h.key || '').toLowerCase() === 'content-type' && (h.value || '').toLowerCase().includes('json')
    ) || headersStr.includes('application/json');

    const isXmlHeader = (req.headerData || []).some((h: any) =>
      (h.key || '').toLowerCase() === 'content-type' && (h.value || '').toLowerCase().includes('xml')
    ) || headersStr.includes('application/xml') || headersStr.includes('text/xml');

    let isJson = isJsonHeader;
    if (!isJson && !isXmlHeader && rawData.trim()) {
      try {
        JSON.parse(rawData);
        isJson = true;
      } catch (_) {}
    }

    if (isJson) {
      return {
        ...emptyBody,
        mode: 'json',
        json: rawData
      };
    }

    if (isXmlHeader || (rawData.trim().startsWith('<') && rawData.trim().endsWith('>'))) {
      return {
        ...emptyBody,
        mode: 'xml',
        xml: rawData
      };
    }

    return {
      ...emptyBody,
      mode: 'text',
      text: rawData
    };
  }

  if (dataMode === 'params') {
    // Multipart / form-data
    const items = Array.isArray(req.data) ? req.data : [];
    return {
      ...emptyBody,
      mode: 'multipartForm',
      multipartForm: items.map((d: any) => ({
        uid: uuid(),
        name: d.key || '',
        value: d.value || '',
        type: d.type === 'file' ? 'file' : 'text',
        description: d.description || '',
        enabled: d.enabled !== false
      }))
    };
  }

  if (dataMode === 'urlencoded') {
    const items = Array.isArray(req.data) ? req.data : [];
    return {
      ...emptyBody,
      mode: 'formUrlEncoded',
      formUrlEncoded: items.map((d: any) => ({
        uid: uuid(),
        name: d.key || '',
        value: d.value || '',
        description: d.description || '',
        enabled: d.enabled !== false
      }))
    };
  }

  if (dataMode === 'graphql') {
    return {
      ...emptyBody,
      mode: 'graphql',
      graphql: {
        query: req.rawModeData || (req.data && req.data.query) || '',
        variables: (req.data && req.data.variables) || ''
      }
    };
  }

  return emptyBody;
};

const parseRawHeaders = (headersStr: string): Array<{ uid: string; name: string; value: string; description: string; enabled: boolean }> => {
  if (!headersStr || typeof headersStr !== 'string') return [];
  const lines = headersStr.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      return {
        uid: uuid(),
        name: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
        description: '',
        enabled: true
      };
    }
    return null;
  }).filter((h): h is NonNullable<typeof h> => h !== null);
};

const convertPostmanV1Request = (req: any, seqIndex: number): any => {
  const reqName = req.name || 'Untitled Request';
  const method = req.method ? req.method.toUpperCase() : 'GET';
  const isGraphQL = req.dataMode === 'graphql';

  // Headers
  let headers: Array<{ uid: string; name: string; value: string; description: string; enabled: boolean }> = [];
  if (Array.isArray(req.headerData) && req.headerData.length > 0) {
    headers = req.headerData.map((h: any) => ({
      uid: uuid(),
      name: h.key || '',
      value: h.value || '',
      description: h.description || '',
      enabled: h.enabled !== false
    }));
  } else if (req.headers) {
    headers = parseRawHeaders(req.headers);
  }

  // Params (Query and Path)
  const params: Array<{ uid: string; name: string; value: string; description: string; type: 'query' | 'path'; enabled: boolean }> = [];

  if (Array.isArray(req.queryParams)) {
    req.queryParams.forEach((q: any) => {
      if (q && q.key != null) {
        params.push({
          uid: uuid(),
          name: q.key || '',
          value: q.value || '',
          description: q.description || '',
          type: 'query',
          enabled: q.enabled !== false
        });
      }
    });
  }

  if (Array.isArray(req.pathVariableData)) {
    req.pathVariableData.forEach((p: any) => {
      if (p && p.key != null) {
        params.push({
          uid: uuid(),
          name: p.key || '',
          value: p.value || '',
          description: p.description || '',
          type: 'path',
          enabled: true
        });
      }
    });
  } else if (req.pathVariables && typeof req.pathVariables === 'object') {
    Object.entries(req.pathVariables).forEach(([key, val]) => {
      params.push({
        uid: uuid(),
        name: key,
        value: String(val ?? ''),
        description: '',
        type: 'path',
        enabled: true
      });
    });
  }

  // URL
  const url = typeof req.url === 'string' ? req.url : (req.url?.raw || '');

  return {
    uid: uuid(),
    name: reqName,
    type: isGraphQL ? 'graphql-request' : 'http-request',
    seq: seqIndex,
    request: {
      url,
      method,
      headers,
      params,
      body: convertPostmanV1Body(req),
      auth: convertPostmanV1Auth(req.auth),
      script: {
        req: req.preRequestScript || '',
        res: ''
      },
      vars: {
        req: [],
        res: []
      },
      assertions: [],
      tests: req.tests || '',
      docs: req.description || ''
    }
  };
};

const buildFolderTree = (
  folders: any[] = [],
  requests: any[] = [],
  rootOrder: string[] = [],
  rootFoldersOrder: string[] = []
): any[] => {
  const requestMap = new Map<string, any>();
  requests.forEach((r) => {
    if (r.id) requestMap.set(r.id, r);
  });

  const folderMap = new Map<string, any>();
  folders.forEach((f) => {
    if (f.id) folderMap.set(f.id, f);
  });

  const processedRequestIds = new Set<string>();
  const processedFolderIds = new Set<string>();

  const convertFolder = (folder: any, seqIndex: number): any => {
    processedFolderIds.add(folder.id);
    const childItems: any[] = [];
    let childSeq = 1;

    // 1. Subfolders listed in folder.folders_order
    const subfolderIds = Array.isArray(folder.folders_order) ? folder.folders_order : [];
    for (const subId of subfolderIds) {
      const subFolder = folderMap.get(subId);
      if (subFolder && !processedFolderIds.has(subId)) {
        childItems.push(convertFolder(subFolder, childSeq++));
      }
    }

    // 2. Any folders with parent pointer to this folder
    for (const otherFolder of folders) {
      if (
        (otherFolder.folder === folder.id || otherFolder.parentId === folder.id) &&
        !processedFolderIds.has(otherFolder.id)
      ) {
        childItems.push(convertFolder(otherFolder, childSeq++));
      }
    }

    // 3. Requests listed in folder.order
    const folderRequestIds = Array.isArray(folder.order) ? folder.order : [];
    for (const reqId of folderRequestIds) {
      const req = requestMap.get(reqId);
      if (req && !processedRequestIds.has(reqId)) {
        processedRequestIds.add(reqId);
        childItems.push(convertPostmanV1Request(req, childSeq++));
      }
    }

    // 4. Any requests pointing to this folder via req.folder
    for (const req of requests) {
      if (req.folder === folder.id && !processedRequestIds.has(req.id)) {
        processedRequestIds.add(req.id);
        childItems.push(convertPostmanV1Request(req, childSeq++));
      }
    }

    return {
      uid: uuid(),
      name: folder.name || 'Folder',
      type: 'folder',
      seq: seqIndex,
      items: childItems,
      root: {
        meta: {
          name: folder.name || 'Folder',
          seq: seqIndex
        },
        request: {
          headers: [] as any[],
          params: [] as any[],
          auth: { mode: 'inherit' },
          vars: { req: [] as any[], res: [] as any[] },
          assert: [] as any[],
          tests: '',
          docs: folder.description || '',
          script: { req: '', res: '' }
        }
      }
    };
  };

  const rootItems: any[] = [];
  let rootSeq = 1;

  // 1. Root folders listed in col.folders_order
  const topFolderIds = Array.isArray(rootFoldersOrder) ? rootFoldersOrder : [];
  for (const fId of topFolderIds) {
    const folder = folderMap.get(fId);
    if (folder && !processedFolderIds.has(fId)) {
      rootItems.push(convertFolder(folder, rootSeq++));
    }
  }

  // 2. Root folders without parent
  for (const folder of folders) {
    if (!folder.folder && !folder.parentId && !processedFolderIds.has(folder.id)) {
      rootItems.push(convertFolder(folder, rootSeq++));
    }
  }

  // 3. Root requests in col.order
  const topRequestIds = Array.isArray(rootOrder) ? rootOrder : [];
  for (const rId of topRequestIds) {
    const req = requestMap.get(rId);
    if (req && !processedRequestIds.has(rId)) {
      processedRequestIds.add(rId);
      rootItems.push(convertPostmanV1Request(req, rootSeq++));
    }
  }

  // 4. Any root requests without a folder
  for (const req of requests) {
    if ((!req.folder || req.folder === null) && !processedRequestIds.has(req.id)) {
      processedRequestIds.add(req.id);
      rootItems.push(convertPostmanV1Request(req, rootSeq++));
    }
  }

  // 5. Any leftover requests not yet caught
  for (const req of requests) {
    if (!processedRequestIds.has(req.id)) {
      processedRequestIds.add(req.id);
      rootItems.push(convertPostmanV1Request(req, rootSeq++));
    }
  }

  return rootItems;
};

export const convertPostmanDumpEnvironments = (environments: any[] = []): any[] => {
  if (!Array.isArray(environments)) return [];
  return environments
    .filter((env) => env && (env.name || env.id))
    .map((env) => ({
      uid: uuid(),
      name: env.name || 'Environment',
      variables: (Array.isArray(env.values) ? env.values : [])
        .filter((v: any) => v && v.key != null)
        .map((v: any) => ({
          uid: uuid(),
          name: String(v.key || '').trim(),
          value: String(v.value ?? ''),
          enabled: v.enabled !== false,
          type: 'text',
          secret: v.type === 'secret'
        }))
    }));
};

export const convertPostmanDumpGlobals = (globals: any[] = []): any | null => {
  if (!Array.isArray(globals) || !globals.length) return null;
  const validVars = globals
    .filter((v: any) => v && v.key != null)
    .map((v: any) => ({
      uid: uuid(),
      name: String(v.key || '').trim(),
      value: String(v.value ?? ''),
      enabled: v.enabled !== false,
      type: 'text',
      secret: v.type === 'secret'
    }));

  if (!validVars.length) return null;
  return {
    uid: uuid(),
    name: 'Globals',
    variables: validVars
  };
};

export interface PostmanDumpResult {
  collections: any[];
  environments: any[];
  summary: {
    collectionCount: number;
    environmentCount: number;
    collectionNames: string[];
    environmentNames: string[];
  };
}

export const convertPostmanDumpToBruno = (data: any): PostmanDumpResult => {
  if (!isPostmanBackup(data)) {
    throw new Error('Invalid Postman backup/dump format');
  }

  const parsedEnvironments = convertPostmanDumpEnvironments(data.environments);
  const globalsEnv = convertPostmanDumpGlobals(data.globals);
  if (globalsEnv) {
    parsedEnvironments.push(globalsEnv);
  }

  const collections = (Array.isArray(data.collections) ? data.collections : []).map((col: any) => {
    const colName = col.name || 'Untitled Collection';
    const items = buildFolderTree(
      col.folders || [],
      col.requests || [],
      col.order || [],
      col.folders_order || []
    );

    // Collection variables
    const collectionVars = (Array.isArray(col.variables) ? col.variables : []).map((v: any) => ({
      uid: uuid(),
      name: v.key || '',
      value: String(v.value ?? ''),
      enabled: v.enabled !== false,
      description: v.description || ''
    }));

    return {
      version: '1',
      name: colName,
      type: 'collection',
      items,
      environments: cloneDeep(parsedEnvironments),
      root: {
        meta: {
          name: colName
        },
        request: {
          headers: [] as any[],
          params: [] as any[],
          auth: convertPostmanV1Auth(col.auth) || { mode: 'none' },
          vars: {
            req: collectionVars,
            res: [] as any[]
          },
          assert: [] as any[],
          tests: '',
          docs: col.description || '',
          script: {
            req: '',
            res: ''
          }
        }
      }
    };
  });

  return {
    collections,
    environments: parsedEnvironments,
    summary: {
      collectionCount: collections.length,
      environmentCount: parsedEnvironments.length,
      collectionNames: collections.map((c: any) => c.name),
      environmentNames: parsedEnvironments.map((e: any) => e.name)
    }
  };
};
