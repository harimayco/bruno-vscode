import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth: any, requestAuth: any) => {
  // Discovered edge case where code generation fails when you create a collection which has not been saved yet:
  // Collection auth therefore null, and request inherits from collection, therefore it is also null
  if (!collectionRootAuth && !requestAuth) {
    return [];
  }

  const auth = collectionRootAuth && ['inherit'].includes(requestAuth?.mode) ? collectionRootAuth : requestAuth;
  if (!auth || !auth.mode || auth.mode === 'none' || auth.mode === 'inherit') {
    return [];
  }

  switch (auth.mode) {
    case 'basic': {
      const username = get(auth, 'basic.username', '') || '';
      const password = get(auth, 'basic.password', '') || '';
      const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Basic ${basicToken}`
        }
      ];
    }
    case 'bearer': {
      const token = get(auth, 'bearer.token', '') || '';
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${token}`
        }
      ];
    }
    case 'apikey': {
      const apiKeyAuth = get(auth, 'apikey', {});
      const key = get(apiKeyAuth, 'key', '') || '';
      const value = get(apiKeyAuth, 'value', '') || '';
      const placement = get(apiKeyAuth, 'placement', 'header');

      if (placement === 'header' && key) {
        return [
          {
            enabled: true,
            name: String(key),
            value: String(value)
          }
        ];
      }
      return [];
    }
    default:
      return [];
  }
};

