import { SessionOptions } from 'iron-session';

// This is the shape of our session data
export interface SessionData {
  isLoggedIn: boolean;
}

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword) {
  console.warn(
    'WARNING: SESSION_PASSWORD environment variable is not set. Using a temporary, insecure password for debugging purposes only. This should not be used in production.'
  );
}

export const sessionOptions: SessionOptions = {
  // The password must be at least 32 characters long for security
  password: sessionPassword || 'complex_password_for_testing_32_characters_long',
  cookieName: 'access-git-session',
  // See https://www.npmjs.com/package/iron-session for more cookie options
  cookieOptions: {
    // secure: true should be used in production (HTTPS)
    secure: process.env.NODE_ENV === 'production',
  },
}; 