import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOctokit } from '@/lib/github';

// GET - Fetches repositories for an organization, with an optional filter for a topic
export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  const { orgLogin } = params;
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');

  if (!topic) {
    return NextResponse.json({ error: "A 'topic' query parameter is required." }, { status: 400 });
  }

  try {
    const octokit = getOctokit();
    
    // Fetch repositories for the given topic from Supabase
    const { data: repos, error } = await supabase
      .from('gh_repositories')
      .select('id, name, full_name, html_url')
      .eq('owner', orgLogin)
      .eq('topic', topic);

    if (error) {
      console.error('Supabase error fetching repositories by topic:', error.message);
      throw new Error('Failed to fetch repositories from the database.');
    }

    // Fetch contributors for each repository in parallel
    const reposWithContributors = await Promise.all(
      repos.map(async (repo) => {
        try {
          const { data: contributors } = await octokit.repos.listContributors({
            owner: orgLogin,
            repo: repo.name,
            per_page: 5, // Limit to top 5 contributors to keep it concise
          });
          return {
            ...repo,
            // We only need the avatar_url and login for the UI
            contributors: contributors.map(c => ({ login: c.login, avatar_url: c.avatar_url })),
          };
        } catch (e) {
          // If fetching contributors fails for a repo, log it and continue
          console.error(`Failed to fetch contributors for ${repo.full_name}:`, e);
          return { ...repo, contributors: [] }; // Return repo with empty contributors
        }
      })
    );

    return NextResponse.json(reposWithContributors);

  } catch (error: any) {
    console.error(`Error fetching repositories for topic '${topic}':`, error.message);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 