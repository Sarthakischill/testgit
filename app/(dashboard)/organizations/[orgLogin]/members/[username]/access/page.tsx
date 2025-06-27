'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { fetcher } from '@/lib/fetcher';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ExternalLink, Lock, Edit3 as EditIcon, User as DirectIcon, Users as TeamIcon, Trash2 as RemoveIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ManageCollaboratorDialog = dynamic(() => 
  import('@/components/dialogs/ManageCollaboratorDialog').then((mod) => mod.ManageCollaboratorDialog)
);

type AccessVia = {
  type: 'team' | 'direct';
  name?: string;
};

type RepoAccessInfo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  permission_level: string;
  access_via: AccessVia[];
};

type MemberAccessParams = {
  orgLogin: string;
  username: string;
};

export default function MemberAccessPage() {
  const params = useParams() as MemberAccessParams;
  const router = useRouter();
  const { toast } = useToast();

  const [dialogRepo, setDialogRepo] = useState<RepoAccessInfo | null>(null);
  const [removingRepo, setRemovingRepo] = useState<RepoAccessInfo | null>(null);
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  const {
    data: repoAccessList,
    error,
    isLoading,
    mutate,
  } = useSWR<RepoAccessInfo[]>(
    `/api/organizations/${params.orgLogin}/members/${params.username}/access-summary`,
    fetcher
  );

  const handleRemoveDirectAccess = async () => {
    if (!removingRepo) return;
    setIsSubmittingRemove(true);
    try {
      const res = await fetch(`/api/repositories/${params.orgLogin}/${removingRepo.name}/collaborators/${params.username}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove direct access.');
      }
      toast({
        title: 'Success!',
        description: `Direct access for ${params.username} on ${removingRepo.name} has been removed.`,
      });
      mutate(); // Re-fetch data
      setRemovingRepo(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message,
      });
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  const renderError = () => (
    <div className="p-4">
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <h2 className="text-lg font-semibold text-destructive">Error Loading Access Summary</h2>
        <p className="mt-2 text-sm text-destructive">{error?.message || 'An error occurred while fetching the data.'}</p>
        <p className="mt-2 text-xs text-muted-foreground">This can happen if the user is not a member of the organization or if the Personal Access Token used does not have admin rights for the organization.</p>
      </div>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-[300px]" />
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (error) return renderError();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Repository Access for {params.username}</h1>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
      </div>

      {isLoading ? renderLoadingSkeleton() : !repoAccessList || repoAccessList.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No Repository Access</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">This user does not appear to have access to any repositories in the {params.orgLogin} organization.</p></CardContent>
        </Card>
      ) : (
        <>
          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Effective Permission</TableHead>
                  <TableHead>Access Via</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repoAccessList.map(repoAccess => (
                  <TableRow key={repoAccess.id}>
                    <TableCell>
                      <Link href={repoAccess.html_url} target="_blank" className="hover:text-primary group inline-flex items-center font-medium">
                        {repoAccess.private && <Lock className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover:text-primary" />}
                        {repoAccess.name}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-50 group-hover:opacity-100"/>
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{repoAccess.permission_level}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {repoAccess.access_via.map((via, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1.5">
                            {via.type === 'direct' ? <DirectIcon className="h-3 w-3" /> : <TeamIcon className="h-3 w-3" />}
                            <span className="capitalize">{via.name || via.type}</span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setDialogRepo(repoAccess)} title="Edit Direct Access">
                        <span className="sr-only">Edit Access</span>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRemovingRepo(repoAccess)} title="Remove Direct Access">
                         <span className="sr-only">Remove Access</span>
                        <RemoveIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild className="h-8 px-2">
                        <Link href={`/repositories/${params.orgLogin}/${repoAccess.name}/manage`}>
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogRepo && (
        <ManageCollaboratorDialog
          owner={params.orgLogin}
          repo={dialogRepo.name}
          editingUser={{
            login: params.username,
            permission: dialogRepo.permission_level as any,
          }}
          isOpen={!!dialogRepo}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDialogRepo(null);
            }
          }}
          onSuccess={() => {
            toast({ title: "Success", description: "Direct access has been updated." });
            mutate(); // Re-fetch the data
            setDialogRepo(null);
          }}
        />
      )}

      <AlertDialog open={!!removingRepo} onOpenChange={(isOpen) => !isOpen && setRemovingRepo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold">{params.username}</span>'s direct access to the <span className="font-semibold">{removingRepo?.name}</span> repository. They may still have access via team membership.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveDirectAccess} disabled={isSubmittingRemove} className="bg-destructive hover:bg-destructive/90">
              {isSubmittingRemove && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, remove access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 