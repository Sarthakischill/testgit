'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fetcher } from '@/lib/fetcher';

interface Props {
  owner: string;
  repo: string;
}

// Define types for the data we expect from the new endpoint
interface ActivitySummary {
  details: {
    open_issues_count: number;
  };
  pulls: {
    id: number;
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
  }[];
  branches: {
    name: string;
    protected: boolean;
  }[];
  commits: {
    sha: string;
    url: string;
    message: string;
    authorName?: string;
    authorLogin?: string;
    date?: string;
  }[];
}

export function ActivitySnapshot({ owner, repo }: Props) {
  const { data, error, isLoading } = useSWR<ActivitySummary>(
    `/api/repositories/${owner}/${repo}/activity-summary`,
    fetcher
  );

  const renderLoading = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  if (error) return <p className="text-xs text-destructive">Failed to load activity.</p>;
  if (isLoading) return renderLoading();

  const { details, pulls, branches, commits } = data || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5 text-primary" />
          Activity Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <p>
          <strong className="text-muted-foreground">Open Issues:</strong>{' '}
          {details?.open_issues_count ?? 'N/A'}
        </p>

        <div>
          <h4 className="font-medium text-foreground mb-1">
            Open Pull Requests ({pulls?.length || 0})
          </h4>
          {(pulls || []).length === 0 && <p className="text-xs text-muted-foreground">No open pull requests.</p>}
          <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
            {(pulls || []).map((pr) => (
              <li key={pr.id} className="text-xs truncate">
                <Link href={pr.html_url} target="_blank" className="hover:text-primary text-muted-foreground hover:underline">
                  #{pr.number}: {pr.title} (by {pr.user.login})
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-foreground mb-1">
            Recent Branches ({branches?.length || 0})
          </h4>
          {(branches || []).length === 0 && <p className="text-xs text-muted-foreground">No recent branches found.</p>}
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {(branches || []).map((branch) => (
              <Badge key={branch.name} variant={branch.protected ? "default" : "outline"} className="text-xs font-normal">
                {branch.name}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-foreground mb-1">
            Recent Commits ({commits?.length || 0})
          </h4>
          {(commits || []).length === 0 && <p className="text-xs text-muted-foreground">No recent commits found.</p>}
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {(commits || []).map((commit) => (
              <li key={commit.sha} className="text-xs border-b border-border/50 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                <Link href={commit.url} target="_blank" className="hover:text-primary text-muted-foreground hover:underline block truncate">
                  {commit.message}
                </Link>
                <span className="text-xs text-muted-foreground/70">
                  by {commit.authorName || commit.authorLogin || 'Unknown'} -{' '}
                  {commit.date ? formatDistanceToNow(parseISO(commit.date), { addSuffix: true }) : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 