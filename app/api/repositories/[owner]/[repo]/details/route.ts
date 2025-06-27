import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit();
    const { owner, repo } = params;

    const [repoDetails, languages, contributors] = await Promise.all([
      octokit.request('GET /repos/{owner}/{repo}', { owner, repo }),
      octokit.request('GET /repos/{owner}/{repo}/languages', { owner, repo }),
      octokit.request('GET /repos/{owner}/{repo}/contributors', { owner, repo, per_page: 15 }),
    ]);

    // Trim the full repository object down to only what the frontend needs
    const leanRepoDetails = {
      owner: {
        login: repoDetails.data.owner.login,
        type: repoDetails.data.owner.type,
      },
      name: repoDetails.data.name,
      full_name: repoDetails.data.full_name,
      description: repoDetails.data.description,
      html_url: repoDetails.data.html_url,
      permissions: repoDetails.data.permissions,
      languages: languages.data,
      contributors: contributors.data.map(c => ({
        id: c.id,
        login: c.login,
        avatar_url: c.avatar_url,
        html_url: c.html_url,
        contributions: c.contributions,
      })),
    };

    return NextResponse.json(leanRepoDetails);
  } catch (error: any) {
    console.error(`Error fetching repo details for ${params.owner}/${params.repo}:`, error.status, error.message);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch repo details' }, { status });
  }
} 