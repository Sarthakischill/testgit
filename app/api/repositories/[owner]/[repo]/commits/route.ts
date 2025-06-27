import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit();
    const { owner, repo } = params;
    const searchParams = new URL(request.url).searchParams;
    const perPage = parseInt(searchParams.get('per_page') || '5', 10);

    if (!owner || !repo) {
      return NextResponse.json({ error: "Owner and repository name are required." }, { status: 400 });
    }

    const { data, status } = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner,
      repo,
      per_page: perPage,
    });

    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error(`Error getting commits for ${params.owner}/${params.repo}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to get commits';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
} 