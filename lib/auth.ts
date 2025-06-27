// Utility functions for managing GitHub PAT

export const setPAT = (token: string) => {
  // Store in localStorage for client-side access
  localStorage.setItem('github_pat', token);
  
  // Store in cookie for server-side access
  document.cookie = `github_pat=${token}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
};

export const clearPAT = () => {
  // Clear from localStorage
  localStorage.removeItem('github_pat');
  
  // Clear from cookies
  document.cookie = 'github_pat=; path=/; max-age=0';
};

export const getPAT = () => {
  return localStorage.getItem('github_pat');
}; 