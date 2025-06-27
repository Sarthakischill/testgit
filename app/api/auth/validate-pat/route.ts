import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST(request: Request) {
  try {
    const { pat } = await request.json();

    if (!pat) {
      return NextResponse.json(
        { error: 'Personal Access Token is required' },
        { status: 400 }
      );
    }

    // Create an Octokit instance with the provided PAT
    const octokit = new Octokit({ auth: pat });

    // Try to get the authenticated user's information
    const { data: user } = await octokit.users.getAuthenticated();

    return NextResponse.json({
      valid: true,
      user: {
        login: user.login,
        avatar_url: user.avatar_url,
        name: user.name,
        html_url: user.html_url,
      },
    });
  } catch (error: any) {
    console.error('PAT validation error:', error);
    return NextResponse.json(
      { error: 'Invalid Personal Access Token' },
      { status: 401 }
    );
  }
} 