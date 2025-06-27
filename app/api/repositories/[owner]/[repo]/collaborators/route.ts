// app/api/repositories/[owner]/[repo]/collaborators/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github'; // Adjust path

const VALID_PERMISSIONS = ['pull', 'push', 'admin', 'maintain', 'triage'] as const;
type ValidPermission = typeof VALID_PERMISSIONS[number];

// Define a leaner type for our needs
type LeanCollaborator = {
  id: number;
  login: string;
  avatar_url: string;
  role_name: string;
};

// GET - List collaborators
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

    // Get all collaborators using the Teams API
    const { data, status } = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
      owner,
      repo,
      affiliation: 'direct', // Only fetch direct collaborators
      per_page: 100, // Fetch up to 100
    });

    // Map the full response to our smaller, custom object
    const leanCollaborators: LeanCollaborator[] = data.map(collab => ({
      id: collab.id,
      login: collab.login,
      avatar_url: collab.avatar_url,
      role_name: collab.role_name,
    }));

    return NextResponse.json(leanCollaborators, { status });
  } catch (error: any) {
    // If GitHub returns 404, it means the repo has no collaborators. 
    // This is not an error for us, so we return an empty array.
    if (error.status === 404) {
      return NextResponse.json([], { status: 200 });
    }
    console.error(`Error getting collaborators for ${params.owner}/${params.repo}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to get collaborators';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
  }
}

// PUT - Add or update a collaborator's permission
export async function PUT(
  request: NextRequest,
    { params }: { params: { owner: string; repo: string } }
  ) {
    try {
      const octokit = getOctokit();
      const { owner, repo } = params;
    const { username, permission } = await request.json() as { username: string; permission: string };
  
    if (!owner || !repo || !username) {
      return NextResponse.json({ error: "Owner, repository name, and username are required." }, { status: 400 });
      }
  
    if (!permission) {
      return NextResponse.json({ error: "Permission level is required." }, { status: 400 });
    }

    // Add/update the collaborator using the Teams API
    await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
        owner,
        repo,
        username,
        permission,
      });
  
    // Return a 200 response since GitHub returns 204
    return new Response(null, { status: 200 });
    } catch (error: any) {
    console.error(`Error adding/updating collaborator ${error.response?.data?.username || 'unknown'} to ${params.owner}/${params.repo}:`, error.status, error.response?.data || error.message);
    const ghStatus = error.status;
    const message = error.response?.data?.message || error.message || 'Failed to add/update collaborator';
    return NextResponse.json({ error: message, details: error.response?.data?.errors, ghStatus }, { status: ghStatus || 500 });
    }
  }
  
// DELETE - Remove a collaborator
  export async function DELETE(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string; username: string } }
  ) {
    try {
      const octokit = getOctokit();
    const { owner, repo, username } = params;

      if (!username) {
      return NextResponse.json({ 
        error: 'Username is required',
        details: [{ field: 'username', message: 'Username parameter is missing' }]
      }, { status: 400 });
      }
  
      await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
        owner,
        repo,
        username,
      });
  
    return new NextResponse(null, { status: 204 });
    } catch (error: any) {
    console.error('Error removing collaborator:', {
      repo: `${params.owner}/${params.repo}`,
      username: params.username,
      error: error.message,
      status: error.status,
      response: error.response?.data
    });

      const status = error.status || 500;
    const errorResponse: any = {
      error: error.response?.data?.message || error.message || 'Failed to remove collaborator',
      gh_status: error.status
    };

    if (error.response?.data?.errors) {
      errorResponse.details = error.response.data.errors;
    }

    return NextResponse.json(errorResponse, { status });
    }
  }