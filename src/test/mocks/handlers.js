// src/test/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Firebase Auth: signInAnonymously
  // POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=...
  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signUp', () => {
    return HttpResponse.json({
      kind: 'identitytoolkit#SignupNewUserResponse',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: '3600',
      localId: 'mock-uid-123',
    });
  }),

  // Mock Firebase Auth: getAccountInfo
  http.post('https://identitytoolkit.googleapis.com/v1/accounts:lookup', () => {
    return HttpResponse.json({
      kind: 'identitytoolkit#GetAccountInfoResponse',
      users: [
        {
          localId: 'mock-uid-123',
          email: '',
          emailVerified: false,
          displayName: '',
          providerUserInfo: [],
          photoUrl: '',
          passwordHash: '...',
          passwordUpdatedAt: 123456789,
          validSince: '123456789',
          disabled: false,
          lastLoginAt: '123456789',
          createdAt: '123456789',
          customAttributes: '{}',
        },
      ],
    });
  }),
];
