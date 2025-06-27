// app/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/app/api/contexts/AppContext';
import { Input } from "@/components/ui/input";
import { PackageSearch, FolderGit2, Lock, Settings2 as OrgSettingsIcon, FileCode } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

type Repository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  owner: { login: string };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  visibility: string;
};

const PER_PAGE = 30;

export default function HomePage() {
  const {
    selectedContext,
    isLoadingContexts,
    errorContexts: contextLoadingError
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');

  const getKey = (pageIndex: number, previousPageData: Repository[] | null): string | null => {
    if (!selectedContext) return null; // No context selected
    // Reached the end
    if (previousPageData && (!previousPageData.length || previousPageData.length < PER_PAGE)) return null; 
    return `/api/repositories?context_type=${selectedContext.type}&context_login=${selectedContext.login}&page=${pageIndex + 1}`;
  };

  const {
    data: repoPages,
    error: repoFetchError,
    isLoading: loadingPageRepos,
    size,
    setSize
  } = useSWRInfinite<Repository[]>(getKey, fetcher);

  const repos: Repository[] = repoPages?.flat() || [];
  const isLoadingMore = loadingPageRepos || (size > 0 && repoPages && typeof repoPages[size - 1] === "undefined");
  const isEmpty = repoPages?.[0]?.length === 0;
  const isReachingEnd = isEmpty || (repoPages && repoPages[repoPages.length - 1]?.length < PER_PAGE);

  const filteredRepos = repos.filter(repo =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageTitle = selectedContext
    ? `${selectedContext.type === 'user' ? 'Personal' : 'Organization'} Repositories for "${selectedContext.name || selectedContext.login}"`
    : 'Select a Context';

  const showLoadingSkeletons = isLoadingContexts || (loadingPageRepos && !repoFetchError && repos.length === 0);

  return (
    <div className="container mx-auto py-6 space-y-8">
    <div>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground flex-grow whitespace-nowrap">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedContext?.type === 'org' && (
              <>
                <Button variant="outline" size="sm" asChild className="h-9">
                  <Link href={`/organizations/${selectedContext.login}/manage`}>
                    <OrgSettingsIcon className="mr-2 h-4 w-4" /> Manage Organization
                  </Link>
                </Button>
                  <Button variant="outline" size="sm" asChild className="h-9">
                  <Link href={`/organizations/${selectedContext.login}/topics`}>
                      <FileCode className="mr-2 h-4 w-4" /> View Topics
                    </Link>
                  </Button>
              </>
              )}
              {selectedContext && (
                <Input
                  type="search"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto sm:max-w-xs h-9"
                />
              )}
            </div>
          </div>

          {showLoadingSkeletons ? (
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : contextLoadingError && !selectedContext ? (
            <div className="text-center py-10 border border-dashed border-destructive/50 text-destructive rounded-md mt-6">
              <FolderGit2 className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">Error loading contexts:</p>
              <p className="text-sm">{contextLoadingError}</p>
            </div>
          ) : !selectedContext && !isLoadingContexts ? (
            <div className="text-center py-10 border border-dashed border-border rounded-md mt-6">
              <FolderGit2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Please select a context to view repositories.</p>
            </div>
          ) : repoFetchError ? (
            <div className="text-center py-10 border border-dashed border-destructive/50 text-destructive rounded-md mt-6">
              <PackageSearch className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">Error loading repositories:</p>
              <p className="text-sm">{repoFetchError.message}</p>
            </div>
          ) : filteredRepos.length > 0 ? (
            <>
              <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
                      <TableHead>Repository</TableHead>
              <TableHead>Visibility</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
                    {filteredRepos.map((repo) => (
              <TableRow key={repo.id}>
                <TableCell>
                          <div className="flex items-center gap-3">
                            <FolderGit2 className="h-5 w-5 text-muted-foreground" />
                            <Link href={`/repositories/${repo.owner.login}/${repo.name}/manage`} className="font-medium text-primary hover:underline">
                            {repo.name}
                            </Link>
                          </div>
                </TableCell>
                <TableCell>
                          <div className="flex items-center gap-2">
                            {repo.private && <Lock className="h-4 w-4 text-muted-foreground" />}
                            <span className="capitalize">{repo.visibility}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                            <Link href={`/repositories/${repo.owner.login}/${repo.name}/manage`}>
                              Manage
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
              </div>
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setSize(size + 1)}
                  disabled={isLoadingMore || isReachingEnd}
                  variant="secondary"
                >
                  {isLoadingMore
                    ? 'Loading...'
                    : isReachingEnd
                    ? 'No more repositories'
                    : 'Load More'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 border border-dashed border-border rounded-md mt-6">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? `No repositories found matching "${searchTerm}".` : `No repositories found for "${selectedContext?.name || selectedContext?.login}".`}
              </p>
              {selectedContext?.type === 'user' && !searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">Try creating a new repository on GitHub!</p>
              )}
              {selectedContext?.type === 'org' && !searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">Ensure your PAT has access to this organization's repositories or check if the organization has any repositories.</p>
              )}
            </div>
          )}
      </div>
    </div>
  );
}