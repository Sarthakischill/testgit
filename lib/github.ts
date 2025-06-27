// lib/github.ts
import { Octokit } from '@octokit/rest';
import { cookies } from 'next/headers';

// Helper to get PAT from different sources
const getToken = () => {
  // For server components
  if (typeof window === 'undefined') {
    // Get from cookies (synced from client)
    const cookieStore = cookies();
    return cookieStore.get('github_pat')?.value;
  }

  // For client components
  return localStorage.getItem('github_pat');
};

// Base Octokit instance creator
export const getOctokit = () => {
  const token = getToken();
  if (!token) {
    throw new Error(
      typeof window === 'undefined'
        ? 'GitHub authentication required. Please sign in with your PAT.'
        : 'Please add your GitHub Personal Access Token in the profile menu to continue.'
    );
  }
  return new Octokit({ auth: token });
};

// Helper to determine highest permission level
export const getHighestPermission = (permissions: {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
  triage?: boolean;
  pull?: boolean;
}): string => {
  if (permissions.admin) return 'admin';
  if (permissions.maintain) return 'maintain';
  if (permissions.push) return 'push';
  if (permissions.triage) return 'triage';
  return 'pull';
};