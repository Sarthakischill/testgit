import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit();
    const { owner, repo } = params;

    if (!owner || !repo) {
      return NextResponse.json({ error: "Owner and repository name are required." }, { status: 400 });
    }

    // This endpoint lists teams that have DIRECT access to the repository.
    // It includes the permission level of the team on this repository.
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/teams', {
      owner,
      repo,
      per_page: 100, // Adjust or paginate if necessary
    });

    // Trim down the full team objects to just what we need
    const leanTeams = data.map(team => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      permission: team.permission,
      html_url: team.html_url,
    }));

    return NextResponse.json(leanTeams);
  } catch (error: any) {
    // A 404 from GitHub here means the repository has no teams, which is not an application error.
    if (error.status === 404) {
      return NextResponse.json([], { status: 200 });
    }
    console.error(`Error fetching teams for repo ${params.owner}/${params.repo}:`, error.status, error.message);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch repository teams' }, { status });
  }
} 