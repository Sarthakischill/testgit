import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin } = params;
    if (!orgLogin) return NextResponse.json({ error: "Org login required" }, { status: 400 });

    const { data } = await octokit.request('GET /orgs/{org}/members', {
      org: orgLogin,
      per_page: 100,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Error fetching members for org ${params.orgLogin}:`, error.status, error.message);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch org members' }, { status });
  }
} 