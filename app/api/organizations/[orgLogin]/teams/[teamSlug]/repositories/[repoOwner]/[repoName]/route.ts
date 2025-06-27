import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgLogin: string; teamSlug: string; repoOwner: string; repoName: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin, teamSlug, repoOwner, repoName } = params;
    const { permission } = await request.json();

    if (!permission) {
      return NextResponse.json({ error: 'Permission is required' }, { status: 400 });
    }
    const validPermissions = ['pull', 'push', 'admin', 'maintain', 'triage'];
    if (!validPermissions.includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission value.' }, { status: 400 });
    }

    // Note: The PAT owner needs to be an org admin OR an admin of the team with ability to manage repo access.
    await octokit.request('PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}', {
      org: orgLogin,
      team_slug: teamSlug,
      owner: repoOwner, // Usually same as orgLogin for org repos
      repo: repoName,
      permission: permission,
    });
    
    // Return a 200 response since GitHub returns 204
    return new Response(null, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating team repo access:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to update team repository access';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgLogin: string; teamSlug: string; repoOwner: string; repoName: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin, teamSlug, repoOwner, repoName } = params;

    await octokit.request('DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}', {
      org: orgLogin,
      team_slug: teamSlug,
      owner: repoOwner,
      repo: repoName,
    });
    
    // Return a 200 response since GitHub returns 204
    return new Response(null, { status: 200 });
  } catch (error: any) {
    console.error(`Error revoking team repo access:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to revoke team repository access';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
} 