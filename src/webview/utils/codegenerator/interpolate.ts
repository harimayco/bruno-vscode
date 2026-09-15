import cloneDeep from 'lodash/cloneDeep';
import { interpolate as interpolateRaw } from '@usebruno/common';

const interpolate = interpolateRaw as (
  str: string,
  obj: Record<string, unknown>,
  options?: { escapeJSONStrings?: boolean }
) => string;

export const safeInterpolate = (
  value: unknown,
  variables: Record<string, unknown>,
  options?: { escapeJSONStrings?: boolean }
): string => {
  if (value == null) return '';
  const str = String(value);
  if (!str.includes('{{')) return str;
  try {
    return interpolate(str, variables, options);
  } catch {
    return str;
  }
};

export const interpolateHeaders = (
  headers: Array<{ name: string; value: string; enabled?: boolean }>,
  variables: Record<string, unknown>
) => {
  if (!Array.isArray(headers)) return [];
  return headers.map((header) => ({
    ...header,
    name: safeInterpolate(header?.name, variables),
    value: safeInterpolate(header?.value, variables)
  }));
};

export const interpolateParams = (
  params: Array<{ name: string; value: string; enabled?: boolean; type?: string }>,
  variables: Record<string, unknown>
) => {
  if (!Array.isArray(params)) return [];
  return params.map((param) => ({
    ...param,
    name: safeInterpolate(param?.name, variables),
    value: safeInterpolate(param?.value, variables)
  }));
};

export const interpolateAuth = (
  auth: any,
  variables: Record<string, unknown>
) => {
  if (!auth || typeof auth !== 'object') return auth;
  const clonedAuth = cloneDeep(auth);

  if (clonedAuth.mode === 'basic' && clonedAuth.basic) {
    clonedAuth.basic.username = safeInterpolate(clonedAuth.basic.username, variables);
    clonedAuth.basic.password = safeInterpolate(clonedAuth.basic.password, variables);
  } else if (clonedAuth.mode === 'bearer' && clonedAuth.bearer) {
    clonedAuth.bearer.token = safeInterpolate(clonedAuth.bearer.token, variables);
  } else if (clonedAuth.mode === 'apikey' && clonedAuth.apikey) {
    clonedAuth.apikey.key = safeInterpolate(clonedAuth.apikey.key, variables);
    clonedAuth.apikey.value = safeInterpolate(clonedAuth.apikey.value, variables);
  } else if (clonedAuth.mode === 'digest' && clonedAuth.digest) {
    clonedAuth.digest.username = safeInterpolate(clonedAuth.digest.username, variables);
    clonedAuth.digest.password = safeInterpolate(clonedAuth.digest.password, variables);
  } else if (clonedAuth.mode === 'oauth2' && clonedAuth.oauth2) {
    if (clonedAuth.oauth2.accessTokenUrl) clonedAuth.oauth2.accessTokenUrl = safeInterpolate(clonedAuth.oauth2.accessTokenUrl, variables);
    if (clonedAuth.oauth2.clientId) clonedAuth.oauth2.clientId = safeInterpolate(clonedAuth.oauth2.clientId, variables);
    if (clonedAuth.oauth2.clientSecret) clonedAuth.oauth2.clientSecret = safeInterpolate(clonedAuth.oauth2.clientSecret, variables);
    if (clonedAuth.oauth2.scope) clonedAuth.oauth2.scope = safeInterpolate(clonedAuth.oauth2.scope, variables);
  }

  return clonedAuth;
};

export const interpolateBody = (
  body: any,
  variables: Record<string, unknown>
) => {
  if (!body || typeof body !== 'object') return body;
  const clonedBody = cloneDeep(body);

  switch (clonedBody.mode) {
    case 'json': {
      if (typeof clonedBody.json === 'string') {
        clonedBody.json = safeInterpolate(clonedBody.json, variables, { escapeJSONStrings: true });
      } else if (typeof clonedBody.json === 'object' && clonedBody.json !== null) {
        try {
          const jsonStr = JSON.stringify(clonedBody.json);
          const interpolatedStr = safeInterpolate(jsonStr, variables, { escapeJSONStrings: true });
          clonedBody.json = JSON.parse(interpolatedStr);
        } catch {
          // ignore parse error
        }
      }
      break;
    }
    case 'text':
    case 'xml':
    case 'sparql': {
      if (typeof clonedBody[clonedBody.mode] === 'string') {
        clonedBody[clonedBody.mode] = safeInterpolate(clonedBody[clonedBody.mode], variables);
      }
      break;
    }
    case 'formUrlEncoded': {
      if (Array.isArray(clonedBody.formUrlEncoded)) {
        clonedBody.formUrlEncoded = clonedBody.formUrlEncoded.map((field: any) => ({
          ...field,
          name: safeInterpolate(field?.name, variables),
          value: safeInterpolate(field?.value, variables)
        }));
      }
      break;
    }
    case 'multipartForm': {
      if (Array.isArray(clonedBody.multipartForm)) {
        clonedBody.multipartForm = clonedBody.multipartForm.map((field: any) => ({
          ...field,
          name: safeInterpolate(field?.name, variables),
          value: safeInterpolate(field?.value, variables)
        }));
      }
      break;
    }
    case 'graphql': {
      if (clonedBody.graphql && typeof clonedBody.graphql === 'object') {
        if (typeof clonedBody.graphql.query === 'string') {
          clonedBody.graphql.query = safeInterpolate(clonedBody.graphql.query, variables);
        }
        if (typeof clonedBody.graphql.variables === 'string') {
          clonedBody.graphql.variables = safeInterpolate(clonedBody.graphql.variables, variables, { escapeJSONStrings: true });
        }
      }
      break;
    }
  }

  return clonedBody;
};
