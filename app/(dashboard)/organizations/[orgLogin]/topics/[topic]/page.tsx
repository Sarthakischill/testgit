'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FolderGit2, PackageSearch, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Contributor = {
  login: string;
  avatar_url: string;
};

type Repository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  contributors: Contributor[];
};

type TopicPageParams = {
  topic: string;
  orgLogin: string;
};

export default function TopicRepositoriesPage() {
  const params = useParams() as TopicPageParams;
  const router = useRouter();
  const { topic, orgLogin } = params;
  const decodedTopic = decodeURIComponent(topic);
  
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!decodedTopic || !orgLogin) return;

    const fetchRepositories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/organizations/${orgLogin}/repositories?topic=${decodedTopic}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch repositories for this topic.');
        }
        const data = await response.json();
        setRepositories(data);
      } catch (e: any) {
        setError(e.message);
        toast({
          title: 'Error',
          description: e.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepositories();
  }, [decodedTopic, orgLogin, toast]);

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Repositories for Topic: <span className="text-primary font-mono">{decodedTopic}</span>
        </h1>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <div className="text-center py-10 border border-dashed border-destructive/50 text-destructive rounded-md mt-6">
          <PackageSearch className="mx-auto h-12 w-12 mb-4" />
          <p className="font-semibold">Error loading repositories:</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : repositories.length > 0 ? (
        <TooltipProvider>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Contributors</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FolderGit2 className="h-5 w-5 text-muted-foreground" />
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          {repo.name}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center -space-x-2">
                        {repo.contributors && repo.contributors.length > 0 ? (
                          repo.contributors.map((c) => (
                            <Tooltip key={c.login}>
                              <TooltipTrigger>
                                <Avatar className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={c.avatar_url} alt={c.login} />
                                  <AvatarFallback>{c.login.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{c.login}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <div className="flex items-center text-muted-foreground text-sm">
                             <Users className="h-4 w-4 mr-2" />
                            No contributors found
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/repositories/${orgLogin}/${repo.name}/manage`}>
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      ) : (
        <div className="text-center py-10 border border-dashed border-border rounded-md mt-6">
          <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No repositories found for this topic in the database.</p>
        </div>
      )}
    </div>
  );
} 