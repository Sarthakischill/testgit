import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE - "Un-assigns" a topic from all associated repositories
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgLogin: string; topic: string } }
) {
  const { orgLogin, topic: rawTopic } = params;
  const topic = decodeURIComponent(rawTopic);

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  try {
    // We don't delete the repository, we just nullify its topic field.
    // This removes the association without being destructive.
    const { data, error } = await supabase
      .from('gh_repositories')
      .update({ topic: null })
      .eq('owner', orgLogin)
      .eq('topic', topic)
      .select(); // Return the records that were updated

    if (error) {
      console.error('Supabase error un-assigning topic:', error.message);
      throw new Error('Failed to remove topic from repositories in the database.');
    }

    return NextResponse.json({
      message: `Successfully removed topic '${topic}' from ${data.length} repositories.`,
    });

  } catch (error: any) {
    console.error(`Error deleting topic ${topic} for org ${orgLogin}:`, error.message);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 