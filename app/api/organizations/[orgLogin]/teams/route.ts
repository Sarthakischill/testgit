import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';
import cache from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  try {
    const { orgLogin } = params;
    if (!orgLogin) {
      return NextResponse.json({ error: "Organization login is required." }, { status: 400 });
    }

    const cacheKey = `teams:${orgLogin}`;

    // Check if data is in cache
    if (cache.has(cacheKey)) {
      return NextResponse.json(cache.get(cacheKey));
    }

    const octokit = getOctokit();
    const { data } = await octokit.request('GET /orgs/{org}/teams', {
      org: orgLogin,
      per_page: 100,
    });

    // Trim the full team objects down to just what we need
    const leanTeams = data.map(team => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
    }));

    // Store the lean result in cache
    cache.set(cacheKey, leanTeams);

    return NextResponse.json(leanTeams);
  } catch (error: any) {
    console.error(`Error fetching teams for org ${params.orgLogin}:`, error.status, error.message);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch teams' }, { status });
  }
} 