// app/api/repositories/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

// Define a leaner type for our needs
type LeanRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
  };
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  visibility: string;
};

export async function GET(request: NextRequest) {
  try {
    const octokit = getOctokit();
    const searchParams = request.nextUrl.searchParams;

    const contextType = searchParams.get('context_type');
    const contextLogin = searchParams.get('context_login');
    const page = parseInt(searchParams.get('page') || '1', 10); // Get page from query
    const per_page = 30; // Set a reasonable page size

    if (!contextType || !contextLogin) {
      return NextResponse.json(
        { error: "Missing 'context_type' or 'context_login' query parameters." },
        { status: 400 }
      );
    }

    let data;

    if (contextType === 'org') {
      const response = await octokit.request('GET /orgs/{org}/repos', {
        org: contextLogin,
        type: 'all',
        per_page, // Use per_page
        page,     // Use page
        sort: 'updated',
        direction: 'desc'
      });
      data = response.data;
    } else if (contextType === 'user') {
      const { data: authenticatedUser } = await octokit.request('GET /user');
      if (authenticatedUser.login === contextLogin) {
        const response = await octokit.request('GET /user/repos', {
          type: 'owner',
          sort: 'updated',
          direction: 'desc',
          per_page, // Use per_page
          page,     // Use page
        });
        data = response.data;
      } else {
        // This case is less common for PATs but included for completeness
        const response = await octokit.request('GET /users/{username}/repos', {
          username: contextLogin,
          type: 'owner',
          sort: 'updated',
          direction: 'desc',
          per_page, // Use per_page
          page,     // Use page
        });
        data = response.data;
      }
    } else {
      return NextResponse.json(
        { error: "Invalid 'context_type' specified. Use 'org' or 'user'." },
        { status: 400 }
      );
    }

    // Map the full response to our smaller, custom object
    const leanRepos: LeanRepository[] = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      owner: {
        login: repo.owner.login
      },
      permissions: repo.permissions,
      visibility: repo.visibility,
    }));

    return NextResponse.json(leanRepos);
  } catch (error: any) {
    console.error("Error fetching repositories:", error.message, error.status);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch repositories' }, { status });
  }
}