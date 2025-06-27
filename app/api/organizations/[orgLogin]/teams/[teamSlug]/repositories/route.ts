import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string; teamSlug: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin, teamSlug } = params;

    if (!orgLogin || !teamSlug) {
      return NextResponse.json({ error: "Organization login and team slug are required." }, { status: 400 });
    }

    const { data } = await octokit.request('GET /orgs/{org}/teams/{team_slug}/repos', {
      org: orgLogin,
      team_slug: teamSlug,
      per_page: 100,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Error fetching repositories for team ${params.teamSlug} in org ${params.orgLogin}:`, error.status, error.message);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch team repositories' }, { status });
  }
} 