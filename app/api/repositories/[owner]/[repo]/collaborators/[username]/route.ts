import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string; username: string } }
) {
  try {
    const octokit = getOctokit();
    const { owner, repo, username } = params;

    if (!owner || !repo || !username) {
      return NextResponse.json({ error: "Owner, repository name, and username are required." }, { status: 400 });
    }

    // Remove the collaborator using the Teams API
    await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username,
    });

    // Return an empty 200 response since the GitHub API returns 204
    return new Response(null, { status: 200 });
  } catch (error: any) {
    console.error(`Error removing collaborator ${params.username} from ${params.owner}/${params.repo}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to remove collaborator';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
} 