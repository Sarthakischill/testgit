import { NextResponse, NextRequest } from 'next/server';
import { getOctokit } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo } = params;
  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and repository are required." }, { status: 400 });
  }

  try {
    const octokit = getOctokit();

    // Perform all API calls in parallel for maximum efficiency
    const [
      detailsPromise,
      pullsPromise,
      branchesPromise,
      commitsPromise,
    ] = await Promise.allSettled([
      octokit.request('GET /repos/{owner}/{repo}', { owner, repo }),
      octokit.request('GET /repos/{owner}/{repo}/pulls', { owner, repo, state: 'open', per_page: 5, sort: 'created' }),
      octokit.request('GET /repos/{owner}/{repo}/branches', { owner, repo, per_page: 5 }),
      octokit.request('GET /repos/{owner}/{repo}/commits', { owner, repo, per_page: 5 }),
    ]);

    // Helper to extract data or return null if the promise was rejected
    const extractData = (promise: PromiseSettledResult<any>) => 
      promise.status === 'fulfilled' ? promise.value.data : null;

    const details = extractData(detailsPromise);
    
    // Trim down the commit objects to only what's needed
    const commits = (extractData(commitsPromise) || []).map((commit: any) => ({
      sha: commit.sha,
      url: commit.html_url,
      message: commit.commit.message.split('\\n')[0],
      authorName: commit.commit.author?.name,
      authorLogin: commit.author?.login,
      date: commit.commit.author?.date,
    }));

    const summary = {
      details: {
        stargazers_count: details?.stargazers_count,
        forks_count: details?.forks_count,
        open_issues_count: details?.open_issues_count,
        license: details?.license?.name,
        topics: details?.topics,
      },
      pulls: extractData(pullsPromise),
      branches: extractData(branchesPromise),
      commits: commits,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error(`Error fetching activity summary for ${owner}/${repo}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch repository activity summary.' },
      { status: 500 }
    );
  }
} 