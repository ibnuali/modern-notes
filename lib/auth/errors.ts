export const AUTH_ERROR_MESSAGE = 'Unable to authenticate with those credentials.';
export const REGISTER_ERROR_MESSAGE = 'Unable to create account with those details.';

export class AuthError extends Error {
  constructor(message = AUTH_ERROR_MESSAGE) {
    super(message);
    this.name = 'AuthError';
  }
}
