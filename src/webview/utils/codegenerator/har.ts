type BodyMode = 'json' | 'text' | 'xml' | 'sparql' | 'formUrlEncoded' | 'graphql' | 'multipartForm' | 'file' | string;

interface Header {
  name: string;
  value: string;
  enabled?: boolean;
}

interface RequestBody {
  mode?: BodyMode;
  [key: string]: unknown;
}

interface FormParam {
  name: string;
  value: string;
  enabled?: boolean;
  type?: string;
}

interface FileParam {
  name?: string;
  filePath?: string;
  contentType?: string;
  selected?: boolean;
}

interface HarRequest {
  url: string;
  method: string;
  body?: RequestBody;
  params?: Array<{ name: string; value: string; enabled?: boolean; type?: string }>;
  auth?: {
    mode?: string;
    apikey?: {
      placement?: string;
      key?: string;
      value?: string;
    };
  };
}

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Replaces {{var}} expressions with temporary alphanumeric tokens so
 * the URL passes URI format validation in HTTPSnippet and har-validator.
 * Returns an unhash helper to restore the original {{var}} in the output snippet.
 */
export const patternHasher = (input: string) => {
  const hashToOriginal: Record<string, string> = {};
  let hashed = false;

  const result = (input || '').replace(VARIABLE_REGEX, (matchedVar) => {
    hashed = true;
    let h = 5381;
    for (let i = 0; i < matchedVar.length; i++) {
      h = ((h << 5) + h + matchedVar.charCodeAt(i)) | 0;
    }
    const token = `bruno_var_hash_${Math.abs(h)}`;
    hashToOriginal[token] = matchedVar;
    return token;
  });

  return {
    hashed: result,
    restore(text: string) {
      if (!hashed || !text) return text;
      let out = text;
      for (const [token, orig] of Object.entries(hashToOriginal)) {
        out = out.replaceAll(token, orig);
      }
      return out;
    }
  };
};

const createContentType = (mode: BodyMode | undefined): string => {
  switch (mode) {
    case 'json':
      return 'application/json';
    case 'text':
      return 'text/plain';
    case 'xml':
      return 'application/xml';
    case 'sparql':
      return 'application/sparql-query';
    case 'formUrlEncoded':
      return 'application/x-www-form-urlencoded';
    case 'graphql':
      return 'application/json';
    case 'multipartForm':
      return 'multipart/form-data';
    case 'file':
      return 'application/octet-stream';
    default:
      return '';
  }
};

/**
 * Creates a list of enabled headers for the request, ensuring valid string names & values,
 * and no duplicate content-type headers.
 */
const createHeaders = (request: HarRequest, headers: Header[] = []): Array<{ name: string; value: string }> => {
  const enabledHeaders = (headers || [])
    .filter((header) => header && header.enabled !== false && typeof header.name === 'string' && header.name.trim() !== '')
    .map((header) => ({
      name: String(header.name).trim(),
      value: header.value == null ? '' : String(header.value)
    }));

  const contentType = createContentType(request.body?.mode);
  if (contentType !== '' && !enabledHeaders.some((header) => header.name.toLowerCase() === 'content-type')) {
    enabledHeaders.push({ name: 'Content-Type', value: contentType });
  }

  return enabledHeaders;
};

/**
 * Creates query parameters ensuring valid strings for name & value to satisfy HAR schema.
 */
const createQuery = (
  queryParams: Array<{ name: string; value: string; enabled?: boolean; type?: string }> = [],
  request: HarRequest
): Array<{ name: string; value: string }> => {
  const params = (queryParams || [])
    .filter((param) => param && param.enabled !== false && (param.type === 'query' || param.type === undefined) && typeof param.name === 'string' && param.name.trim() !== '')
    .map((param) => ({
      name: String(param.name).trim(),
      value: param.value == null ? '' : String(param.value)
    }));

  if (request?.auth?.mode === 'apikey'
    && request?.auth?.apikey?.placement === 'queryparams'
    && request?.auth?.apikey?.key) {
    params.push({
      name: String(request.auth.apikey.key).trim(),
      value: request.auth.apikey.value == null ? '' : String(request.auth.apikey.value)
    });
  }

  return params;
};

/**
 * Creates HAR postData ensuring all fields match the HAR JSON Schema (types must be string / array of objects).
 */
const createPostData = (body?: RequestBody) => {
  if (!body || !body.mode || body.mode === 'none') {
    return undefined;
  }

  const contentType = createContentType(body.mode);
  const mode = body.mode as string;

  switch (body.mode) {
    case 'formUrlEncoded': {
      const formParams = (Array.isArray(body[mode]) ? body[mode] : []) as FormParam[];
      const enabledParams = formParams.filter((param) => param && param.enabled !== false && typeof param.name === 'string' && param.name.trim() !== '');
      const searchParams = new URLSearchParams();
      enabledParams.forEach((param) => {
        searchParams.append(String(param.name).trim(), param.value == null ? '' : String(param.value));
      });
      return {
        mimeType: contentType || 'application/x-www-form-urlencoded',
        text: searchParams.toString(),
        params: enabledParams.map((param) => ({
          name: String(param.name).trim(),
          value: param.value == null ? '' : String(param.value)
        }))
      };
    }
    case 'multipartForm': {
      const multipartParams = (Array.isArray(body[mode]) ? body[mode] : []) as FormParam[];
      const enabledParams = multipartParams.filter((param) => param && param.enabled !== false && typeof param.name === 'string' && param.name.trim() !== '');
      return {
        mimeType: contentType || 'multipart/form-data',
        params: enabledParams.map((param) => ({
          name: String(param.name).trim(),
          value: param.value == null ? '' : String(param.value),
          ...(param.type === 'file' && { fileName: String(param.value || '') })
        }))
      };
    }
    case 'file': {
      const files = (Array.isArray(body[mode]) ? body[mode] : []) as FileParam[];
      const selectedFile = files.find((param) => param.selected) || files[0];
      const filePath = selectedFile?.filePath || '';
      return {
        mimeType: selectedFile?.contentType || 'application/octet-stream',
        text: String(filePath),
        params: filePath
          ? [
              {
                name: String(selectedFile?.name || 'file'),
                value: String(filePath),
                fileName: String(filePath),
                contentType: String(selectedFile?.contentType || 'application/octet-stream')
              }
            ]
          : []
      };
    }
    case 'graphql': {
      const graphqlData = body[mode];
      const text = typeof graphqlData === 'object' && graphqlData !== null
        ? JSON.stringify(graphqlData)
        : String(graphqlData ?? '');
      return {
        mimeType: contentType || 'application/json',
        text
      };
    }
    case 'json': {
      const jsonData = body[mode];
      let text = '';
      if (typeof jsonData === 'object' && jsonData !== null) {
        text = JSON.stringify(jsonData, null, 2);
      } else {
        text = String(jsonData ?? '');
      }
      return {
        mimeType: contentType || 'application/json',
        text
      };
    }
    default: {
      const rawData = body[mode];
      return {
        mimeType: contentType || 'text/plain',
        text: typeof rawData === 'object' && rawData !== null ? JSON.stringify(rawData) : String(rawData ?? '')
      };
    }
  }
};

interface BuildHarRequestParams {
  request: HarRequest;
  headers: Header[];
}

export const buildHarRequest = ({ request, headers }: BuildHarRequestParams) => {
  const rawUrl = request.url || '';
  const { hashed: safeUrl, restore: unhash } = patternHasher(rawUrl);

  let urlForHar = safeUrl;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(urlForHar)) {
    urlForHar = `http://${urlForHar}`;
  }

  const har = {
    method: request.method || 'GET',
    url: urlForHar,
    httpVersion: 'HTTP/1.1',
    cookies: [] as unknown[],
    headers: createHeaders(request, headers),
    queryString: createQuery(request.params, request),
    postData: createPostData(request.body),
    headersSize: 0,
    bodySize: 0,
    binary: true
  };

  return { har, unhash };
};

