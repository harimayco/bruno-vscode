export interface QueryParam {
  name: string;
  value?: string;
}

export interface ParseQueryParamsOptions {
  decode?: boolean;
  stripFragment?: boolean;
}

export interface BuildQueryStringOptions {
  encode?: boolean;
}

/**
 * Parse query string into an array of query parameters
 */
export const parseQueryParams = (
  query: string,
  { decode = false, stripFragment = true }: ParseQueryParamsOptions = {}
): QueryParam[] => {
  if (!query || !query.length) {
    return [];
  }

  try {
    const queryString = stripFragment ? query.split('#')[0] : query;
    const pairs = queryString.split('&');

    const params = pairs
      .map((pair): QueryParam | null => {
        const [name, ...valueParts] = pair.split('=');
        if (!name) {
          return null;
        }

        // Distinguish between ?param (no '=' at all) and ?param= (has '=' with empty value)
        const hasEqualsSign = pair.includes('=');
        const rawValue = hasEqualsSign ? valueParts.join('=') : undefined;
        const value = hasEqualsSign
          ? (decode ? decodeURIComponent(rawValue ?? '') : rawValue)
          : undefined;

        return {
          name: decode ? decodeURIComponent(name) : name,
          value
        };
      })
      .filter((param): param is QueryParam => param !== null);

    return params;
  } catch (error) {
    console.error('Error parsing query params:', error);
    return [];
  }
};

/**
 * Build a query string from an array of query parameters
 */
export const buildQueryString = (
  paramsArray: QueryParam[],
  { encode = false }: BuildQueryStringOptions = {}
): string => {
  return paramsArray
    .filter(({ name }) => typeof name === 'string' && name.trim().length > 0)
    .map(({ name, value }) => {
      const finalName = encode ? encodeURIComponent(name) : name;
      if (value === undefined) {
        return finalName;
      }
      const finalValue = encode ? encodeURIComponent(value) : value;
      return `${finalName}=${finalValue}`;
    })
    .join('&');
};

/**
 * Encodes only query parameters in a URL, leaving the origin and path segments untouched.
 * This prevents 404 errors caused by encoding valid path characters (such as ':', ';', '@', etc.)
 * while fulfilling the request setting contract ("Automatically encode query parameters in the URL").
 */
export const encodeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const queryIdx = url.indexOf('?');
  if (queryIdx === -1) {
    return url;
  }

  const basePath = url.slice(0, queryIdx);
  const queryStringWithHash = url.slice(queryIdx + 1);

  const hashIdx = queryStringWithHash.indexOf('#');
  const queryString = hashIdx >= 0 ? queryStringWithHash.slice(0, hashIdx) : queryStringWithHash;
  const hashFragment = hashIdx >= 0 ? queryStringWithHash.slice(hashIdx) : '';

  if (!queryString || queryString.length === 0) {
    return url;
  }

  const queryParams = parseQueryParams(queryString, { decode: false, stripFragment: false });
  const encodedQueryString = buildQueryString(queryParams, { encode: true });

  return `${basePath}?${encodedQueryString}${hashFragment}`;
};
