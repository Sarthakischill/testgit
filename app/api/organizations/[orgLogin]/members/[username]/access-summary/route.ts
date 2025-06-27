import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';
import cache from '@/lib/cache';
import queue from '@/lib/queue';
import { Endpoints } from "@octokit/types";

type Repo = Endpoints["GET /orgs/{org}/repos"]["response"]["data"][0];
type Team = Endpoints["GET /orgs/{org}/teams"]["response"]["data"][0];
type PermissionResponse = Endpoints["GET /repos/{owner}/{repo}/collaborators/{username}/permission"]["response"]["data"];

interface RepoAccessInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  permission_level: string;
  access_via: { type: 'direct' | 'team'; name?: string }[];
}

const permissionLevels = ['pull', 'triage', 'push', 'maintain', 'admin'];
const getHighestPermission = (current: string, incoming: string): string => {
  const currentLevel = permissionLevels.indexOf(current);
  const incomingLevel = permissionLevels.indexOf(incoming);
  return incomingLevel > currentLevel ? permissionLevels[incomingLevel] : permissionLevels[currentLevel];
};

const getPermissionFromRepo = (repo: Repo): string => {
    if (repo.permissions?.admin) return 'admin';
    if (repo.permissions?.maintain) return 'maintain';
    if (repo.permissions?.push) return 'push';
    if (repo.permissions?.triage) return 'triage';
    if (repo.permissions?.pull) return 'pull';
    return 'pull';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string; username: string } }
) {
  const { orgLogin, username } = params;
  if (!orgLogin || !username) {
    return NextResponse.json({ error: "Organization and username are required." }, { status: 400 });
  }

  const cacheKey = `access-summary-v2:${orgLogin}:${username}`;
  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }

  try {
    const octokit = getOctokit();
    const effectiveRepoAccess = new Map<number, RepoAccessInfo>();

    // Step 1: Verify user is a member of the organization first.
    try {
        await queue.add(() => octokit.orgs.checkMembershipForUser({ org: orgLogin, username }));
    } catch(e: any) {
        if (e.status === 404) {
             return NextResponse.json({ error: "User is not a member of the organization." }, { status: 404 });
        }
        throw e; // re-throw other errors
    }

    // Step 2: Get all teams and check membership in parallel
    const allOrgTeams = await octokit.paginate(octokit.teams.list, { org: orgLogin });
    const membershipCheckPromises = allOrgTeams.map(team => 
      queue.add(() => octokit.teams.getMembershipForUserInOrg({ org: orgLogin, team_slug: team.slug, username })
        .then(() => team as Team)
        .catch(() => null)) // Return null if user is not a member
    );
    const membershipResults = await Promise.allSettled(membershipCheckPromises);
    const userTeams = membershipResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => (r as PromiseFulfilledResult<Team>).value);

    // Step 3: Get repos for teams the user is a member of, in parallel
    const teamRepoPromises = userTeams.map(team => 
      queue.add(() => octokit.paginate(octokit.teams.listReposInOrg, { org: orgLogin, team_slug: team.slug })
        .then(repos => ({ team, repos })))
    );
    const teamRepoResults = await Promise.allSettled(teamRepoPromises);

    teamRepoResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { team, repos } = result.value;
        repos.forEach((repo: Repo) => {
          if (!repo) return;
          const permission = getPermissionFromRepo(repo);
          if (effectiveRepoAccess.has(repo.id)) {
            const existing = effectiveRepoAccess.get(repo.id)!;
            existing.access_via.push({ type: 'team', name: team.name });
            existing.permission_level = getHighestPermission(existing.permission_level, permission);
          } else {
            effectiveRepoAccess.set(repo.id, {
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              private: repo.private,
              html_url: repo.html_url,
              permission_level: permission,
              access_via: [{ type: 'team', name: team.name }],
            });
          }
        });
      }
    });

    // Step 4: Check for direct collaborator access on all organization repos
    const orgRepos = await octokit.paginate(octokit.repos.listForOrg, { org: orgLogin, type: 'all' });
    const directAccessPromises = orgRepos.map(repo => 
      queue.add(() => octokit.repos.getCollaboratorPermissionLevel({ owner: orgLogin, repo: repo.name, username })
            .then(response => ({ repo, permission: response.data as PermissionResponse }))
            .catch(() => null)) // User is not a direct collaborator
    );
    const directAccessResults = await Promise.allSettled(directAccessPromises);
    
    directAccessResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const { repo, permission } = result.value;
            // The permission object is null if user is not a collaborator.
            if (!permission || !permission.permission) return;

            if(effectiveRepoAccess.has(repo.id)) {
                const existing = effectiveRepoAccess.get(repo.id)!;
                // Avoid adding 'direct' if team access already provides higher or equal permission
                const existingLevel = permissionLevels.indexOf(existing.permission_level);
                const directLevel = permissionLevels.indexOf(permission.permission);
                if (directLevel > existingLevel) {
                    existing.permission_level = permission.permission;
                }
                // Check if direct access is already accounted for
                if (!existing.access_via.some(v => v.type === 'direct')) {
                    existing.access_via.push({ type: 'direct' });
                }
            } else {
                 effectiveRepoAccess.set(repo.id, {
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    private: repo.private,
                    html_url: repo.html_url,
                    permission_level: permission.permission,
                    access_via: [{ type: 'direct' }],
                });
            }
        }
    });


    const finalResult = Array.from(effectiveRepoAccess.values());
    cache.set(cacheKey, finalResult);

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error(`Error in access-summary for ${username} in ${orgLogin}:`, error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status });
  }
} 