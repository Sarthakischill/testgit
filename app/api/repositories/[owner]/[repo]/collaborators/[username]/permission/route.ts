import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string; username: string } }
) {
  try {
    const octokit = getOctokit();
    const { owner, repo, username } = params;

    if (!owner || !repo || !username) {
      return NextResponse.json({ error: "Owner, repository name, and username are required." }, { status: 400 });
    }

    // This endpoint returns the permission level if the user is a direct collaborator
    // or a 404 if they are not a collaborator
    const { data, status } = await octokit.request('GET /repos/{owner}/{repo}/collaborators/{username}/permission', {
      owner,
      repo,
      username,
    });

    // The response includes:
    // - permission: The effective permission the user has on the repository
    // - role_name: The user's role in the repository (e.g., "admin", "write", "read")
    // - user: The user object
    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error(`Error getting permission for ${params.username} on ${params.owner}/${params.repo}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to get permission';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
} 