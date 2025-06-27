import { SessionOptions } from 'iron-session';

// This is the shape of our session data
export interface SessionData {
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  // The password must be at least 32 characters long for security
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'access-git-session',
  // See https://www.npmjs.com/package/iron-session for more cookie options
  cookieOptions: {
    // secure: true should be used in production (HTTPS)
    secure: process.env.NODE_ENV === 'production',
  },
}; 