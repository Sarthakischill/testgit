'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { X, ExternalLink } from 'lucide-react';

interface Topic {
  name: string;
  count: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [miscellaneousCount, setMiscellaneousCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const orgLogin = params.orgLogin as string;

  const fetchTopics = useCallback(async () => {
    if (!orgLogin) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/topics`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch topics.');
      }
      const data = await response.json();
      setTopics(data.topics);
      setMiscellaneousCount(data.miscellaneousCount);
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
  }, [orgLogin, toast]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleSyncRepos = async () => {
    if (!orgLogin) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/topics/sync`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync repositories.');
      }
      toast({
        title: 'Sync Successful!',
        description: result.message || 'Repositories have been synced and topics updated.',
      });
      await fetchTopics();
    } catch (e: any) {
      toast({
        title: 'Error syncing repositories',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicToDelete || !orgLogin) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/topics/${encodeURIComponent(topicToDelete)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete topic.');
      }
      toast({
        title: 'Topic Removed',
        description: result.message || `Topic '${topicToDelete}' was successfully removed.`,
      });
      setTopics(prevTopics => prevTopics.filter(t => t.name !== topicToDelete));
    } catch (e: any) {
      toast({
        title: 'Error removing topic',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setTopicToDelete(null);
    }
  };

  const handleRowClick = (topicName: string) => {
    if (!orgLogin) return;
    router.push(`/organizations/${orgLogin}/topics/${topicName}`);
  };

  const renderSkeleton = () => (
    <div className="border rounded-lg p-4">
      <Skeleton className="h-8 w-1/4 mb-4" />
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Repository Topics</h1>
          <Button onClick={handleSyncRepos} disabled={isSyncing || isLoading}>
            {isSyncing ? 'Syncing...' : 'Sync Repos'}
          </Button>
        </div>

        {isLoading ? (
          renderSkeleton()
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : topics.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead className="text-center">Repositories</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map(topic => (
                  <TableRow 
                    key={topic.name} 
                    onClick={() => handleRowClick(topic.name)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{topic.name}</TableCell>
                    <TableCell className="text-center">{topic.count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click from firing
                          setTopicToDelete(topic.name);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          !isLoading && <p>No topics found. Click "Sync Repos" to get started.</p>
        )}
        
        {miscellaneousCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Miscellaneous Repositories</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <p className="text-muted-foreground">
                {miscellaneousCount} {miscellaneousCount === 1 ? 'repository' : 'repositories'} could not be automatically categorized.
              </p>
              <Link href={`/organizations/${orgLogin}/topics/Miscellaneous`} passHref>
                <Button variant="secondary">
                  View Miscellaneous
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!topicToDelete} onOpenChange={() => setTopicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the topic <span className="font-semibold text-primary">{topicToDelete}</span> and un-assign it from all associated repositories. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic} disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 