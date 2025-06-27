import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgLogin: string; teamSlug: string; username: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin, teamSlug, username } = params;
    const { role } = (await request.json()) as { role?: 'member' | 'maintainer' }; // Role is optional

    if (!orgLogin || !teamSlug || !username) {
      return NextResponse.json({ error: "Organization, team slug, and username are required." }, { status: 400 });
    }

    // The 'role' parameter in the GitHub API request body is optional.
    // If not provided, GitHub defaults to 'member'.
    const payload: { role?: 'member' | 'maintainer' } = {};
    if (role && (role === 'member' || role === 'maintainer')) {
      payload.role = role;
    }

    // This adds an organization member to a team.
    // If the user is not an organization member, this will result in an error.
    const { data, status } = await octokit.request('PUT /orgs/{org}/teams/{team_slug}/memberships/{username}', {
      org: orgLogin,
      team_slug: teamSlug,
      username: username,
      ...payload, // Spread the role if it's provided
    });

    // Successful response includes the state of the membership (e.g., 'active', 'pending')
    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error(`Error adding/updating team membership for ${params.username} in team ${params.teamSlug}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to add/update team membership';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgLogin: string; teamSlug: string; username: string } }
) {
  try {
    const octokit = getOctokit();
    const { orgLogin, teamSlug, username } = params;

    if (!orgLogin || !teamSlug || !username) {
      return NextResponse.json({ error: "Organization, team slug, and username are required." }, { status: 400 });
    }

    await octokit.request('DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}', {
      org: orgLogin,
      team_slug: teamSlug,
      username: username,
    });

    // Return a 200 response since GitHub returns 204
    return new Response(null, { status: 200 });
  } catch (error: any) {
    console.error(`Error removing team membership for ${params.username} in team ${params.teamSlug}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to remove team membership';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
} 