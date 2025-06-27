import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOctokit } from '@/lib/github';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  const { orgLogin } = params;

  try {
    const octokit = getOctokit();

    // 1. Fetch all repositories from the GitHub organization
    const githubRepos = await octokit.paginate('GET /orgs/{org}/repos', {
      org: orgLogin,
      per_page: 100,
    });

    // 2. Fetch all existing repository IDs from Supabase for the organization
    const { data: existingRepos, error: dbError } = await supabase
      .from('gh_repositories')
      .select('id')
      .eq('owner', orgLogin);

    if (dbError) {
      console.error('Supabase error fetching existing repository IDs:', dbError.message);
      throw new Error('Failed to fetch existing repository IDs from the database.');
    }

    const existingRepoIds = new Set(existingRepos.map(repo => repo.id));

    // 3. Filter for new repositories that are not in the database
    const newGithubRepos = githubRepos.filter(repo => !existingRepoIds.has(repo.id));

    if (newGithubRepos.length === 0) {
      return NextResponse.json({ message: 'All repositories are already up to date.' }, { status: 200 });
    }

    // 4. Process new repositories to extract topics and prepare for insertion
    const reposToUpsert = newGithubRepos
      .map(repo => {
        const nameParts = repo.name.split('-');
        let topic: string;

        // Check if the repo name fits the <number>-<topic>-... format
        if (nameParts.length >= 2 && !isNaN(parseInt(nameParts[0], 10))) {
          topic = nameParts[1];
        } else {
          // If it doesn't match the convention, assign it to 'Miscellaneous'
          topic = 'Miscellaneous';
        }

        return {
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          owner: repo.owner!.login,
          topic: topic,
        };
      });

    if (reposToUpsert.length === 0) {
        return NextResponse.json({ message: 'All repositories are already up to date, or no new repos match the naming convention.' }, { status: 200 });
    }

    // 5. Upsert the new repositories into the database
    const { data: upsertedData, error: upsertError } = await supabase
      .from('gh_repositories')
      .upsert(reposToUpsert)
      .select();

    if (upsertError) {
      console.error('Supabase error upserting new repositories:', upsertError.message);
      throw new Error('Failed to save new repositories to the database.');
    }

    return NextResponse.json({
      message: `Successfully synced ${upsertedData.length} new repositories.`,
      synced_repos: upsertedData,
    }, { status: 201 });

  } catch (error: any) {
    console.error(`Error syncing repositories for org ${orgLogin}:`, error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred during the sync process.' }, { status: 500 });
  }
} 