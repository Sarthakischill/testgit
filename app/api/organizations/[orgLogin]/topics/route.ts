import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOctokit } from '@/lib/github';
import cache from '@/lib/cache';
import { cookies } from 'next/headers';

// GET - Fetches topics for repositories the authenticated user can access.
export async function GET(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  const { orgLogin } = params;

  // Use user's PAT as part of the cache key to ensure user-specific data
  const pat = cookies().get('github_pat')?.value;
  if (!pat) {
    return NextResponse.json({ error: 'GitHub authentication required.' }, { status: 401 });
  }

  try {
    const octokit = getOctokit();

    // --- Caching Implementation ---
    const cacheKey = `user-repos:${orgLogin}:${pat.slice(-6)}`; // Key includes org and a slice of the PAT
    let userRepoIds: number[] = cache.get(cacheKey) as number[];

    if (!userRepoIds) {
      // If not in cache, fetch from GitHub
      const userRepos = await octokit.paginate('GET /orgs/{org}/repos', {
        org: orgLogin,
        per_page: 100,
      });
      userRepoIds = userRepos.map(repo => repo.id);
      // Store the list of IDs in the cache for 5 minutes
      cache.set(cacheKey, userRepoIds);
    }
    // --- End Caching ---
    
    if (userRepoIds.length === 0) {
      return NextResponse.json({ topics: [], miscellaneousCount: 0 });
    }

    const { data, error } = await supabase
      .from('gh_repositories')
      .select('topic')
      .eq('owner', orgLogin)
      .in('id', userRepoIds) // Filter by the user's accessible repo IDs
      .not('topic', 'is', null);

    if (error) {
      console.error('Supabase error fetching topics:', error.message);
      throw new Error('Failed to fetch topics from the database.');
    }

    // 4. Process the filtered data to get counts for each topic
    const topicCounts = data.reduce((acc, repo) => {
      const topic = repo.topic;
      if (topic) {
        acc[topic] = (acc[topic] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Separate the 'Miscellaneous' topic from the main list
    const miscellaneousCount = topicCounts['Miscellaneous'] || 0;
    delete topicCounts['Miscellaneous'];

    const topics = Object.entries(topicCounts).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => a.name.localeCompare(b.name)); // Sort topics alphabetically

    return NextResponse.json({ topics, miscellaneousCount });

  } catch (error: any) {
    // Handle cases where the GitHub token is invalid or missing
    if (error.message.includes('GitHub authentication required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error(`Error fetching topics for org ${orgLogin}:`, error.message);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while fetching topics.' }, { status: 500 });
  }
}

// POST - Adds a new topic and syncs repositories for 'CodingChaii'
export async function POST(
  request: NextRequest,
  { params }: { params: { orgLogin: string } }
) {
  const { orgLogin } = params;

  if (orgLogin !== 'CodingChaii') {
    return NextResponse.json({ error: "This feature is only available for the 'CodingChaii' organization." }, { status: 403 });
  }

  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required and must be a string.' }, { status: 400 });
    }

    const octokit = getOctokit();

    // Search for repositories in the 'CodingChaii' org that contain the topic in their name
    const searchQuery = `org:CodingChaii ${topic} in:name`;
    const { data: searchResult } = await octokit.search.repos({
      q: searchQuery,
      per_page: 100, // Fetch up to 100 results
    });

    if (searchResult.items.length === 0) {
      return NextResponse.json({ message: `No new repositories found for topic '${topic}'.` }, { status: 200 });
    }

    // Prepare data for Supabase upsert
    const reposToUpsert = searchResult.items
      .filter(repo => repo.owner) // Ensure owner is not null
      .map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        owner: repo.owner!.login, // Non-null assertion is safe here due to the filter
        topic: topic, // Assign the new topic
    }));

    // Upsert the found repositories into the database
    // `onConflict: 'id'` ensures that if a repo with the same ID exists, it gets updated.
    const { data, error } = await supabase
      .from('gh_repositories')
      .upsert(reposToUpsert)
      .select(); // .select() returns the upserted records

    if (error) {
      console.error('Supabase error syncing repositories:', error.message);
      throw new Error('Failed to sync repositories to the database.');
    }

    return NextResponse.json({
      message: `Successfully synced ${data.length} repositories for topic '${topic}'.`,
      synced_repos: data,
    }, { status: 201 });

  } catch (error: any) {
    console.error(`Error syncing repositories for topic in org ${orgLogin}:`, error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 