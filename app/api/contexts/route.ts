// app/api/contexts/route.ts
import { NextResponse } from 'next/server';
import { getOctokit } from '@/lib/github'; // Assuming lib/github.ts exists from previous steps

export interface ContextItem {
  type: 'user' | 'org';
  login: string; // GitHub username or org slug
  name?: string; // Display name (user's name or org slug)
  avatar_url: string | null;
}

export async function GET() {
  try {
    const octokit = getOctokit();
    let contexts: ContextItem[] = [];

    // 1. Get authenticated user (PAT owner's details)
    const { data: user } = await octokit.request('GET /user');
    if (user) {
      contexts.push({
        type: 'user',
        login: user.login,
        name: user.name || user.login, // Use name if available, else login
        avatar_url: user.avatar_url,
      });
    }

    // 2. Get organizations the user belongs to
    const { data: orgs } = await octokit.request('GET /user/orgs');
    if (orgs && orgs.length > 0) {
      orgs.forEach(org => {
        contexts.push({
          type: 'org',
          login: org.login,
          name: org.login, // Orgs typically use 'login' as their display name here
          avatar_url: org.avatar_url,
        });
      });
    }

    return NextResponse.json(contexts);
  } catch (error: any) {
    console.error("Error fetching contexts:", error.message, error.status);
    const status = error.status || 500;
    // Ensure you return a JSON response even for errors
    return NextResponse.json({ error: error.message || 'Failed to fetch contexts' }, { status });
  }
}