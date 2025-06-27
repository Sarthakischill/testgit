'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, ExternalLink, PlusCircle, Edit3, Trash2, Github, Info, Users as CollaboratorsIcon,
  ShieldCheck, Star, GitFork, Eye, Users2 as TeamsIcon, UserPlus, Code, Users, StarIcon
} from 'lucide-react';
import { ActivitySnapshot } from '@/components/repository/ActivitySnapshot';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Lazy load the dialog components
const ManageCollaboratorDialog = dynamic(() =>
  import('@/components/dialogs/ManageCollaboratorDialog').then(mod => mod.ManageCollaboratorDialog)
);
const ManageTeamAccessDialog = dynamic(() =>
  import('@/components/dialogs/ManageTeamAccessDialog').then(mod => mod.ManageTeamAccessDialog)
);

type Collaborator = {
  id: number;
  login: string;
  avatar_url: string;
  role_name: string;
};
type RepositoryParams = { owner: string; repo: string; };
type PermissionValue = 'pull' | 'push' | 'admin' | 'maintain' | 'triage';
type RepositoryOwner = { login: string; type: 'User' | 'Organization'; };
type RepositoryDetails = {
  owner: RepositoryOwner;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  permissions?: { admin: boolean; };
  languages: Record<string, number>;
  contributors: {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
  }[];
};
type TeamWithRepoAccess = { id: number; name: string; slug: string; permission: PermissionValue; html_url: string; };
type OrgTeamSimple = { id: number; name: string; slug: string; };

export default function ManageRepositoryPage() {
  const params = useParams() as RepositoryParams;
  const router = useRouter();
  const { owner, repo } = params;

  // SWR hooks for data fetching
  const { data: repoDetails, error: repoDetailsError, isLoading: isLoadingRepoDetails } = useSWR<RepositoryDetails>(
    owner && repo ? `/api/repositories/${owner}/${repo}/details` : null, fetcher
  );
  const { data: collaborators, mutate: mutateCollaborators, isLoading: isLoadingCollaborators } = useSWR<Collaborator[]>(
    owner && repo ? `/api/repositories/${owner}/${repo}/collaborators` : null, fetcher
  );
  const isOrgRepo = repoDetails?.owner?.type === 'Organization';
  const orgLogin = isOrgRepo ? repoDetails.owner.login : null;
  const { data: repoTeamsAccess, mutate: mutateRepoTeams, isLoading: isLoadingRepoTeams } = useSWR<TeamWithRepoAccess[]>(
    isOrgRepo ? `/api/repositories/${owner}/${repo}/teams` : null, fetcher
  );
  const { data: allOrgTeams, isLoading: isLoadingAllOrgTeams } = useSWR<OrgTeamSimple[]>(
    orgLogin ? `/api/organizations/${orgLogin}/teams` : null, fetcher
  );

  // State for controlling dialogs
  const [isCollaboratorDialogOpen, setIsCollaboratorDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<{ login: string; permission: PermissionValue } | null>(null);
  const [isTeamAccessDialogOpen, setIsTeamAccessDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ teamSlug: string; currentPermission: PermissionValue } | null>(null);

  // State for delete alerts
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Collaborator | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isTeamRevokeAlertOpen, setIsTeamRevokeAlertOpen] = useState(false);
  const [teamToRevoke, setTeamToRevoke] = useState<TeamWithRepoAccess | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  const canAdminister = repoDetails?.permissions?.admin === true;

  const handleOpenCollaboratorDialog = (collaborator?: Collaborator) => {
    setEditingCollaborator(collaborator ? { login: collaborator.login, permission: collaborator.role_name as PermissionValue } : null);
    setIsCollaboratorDialogOpen(true);
  };

  const handleOpenTeamDialog = (team?: TeamWithRepoAccess) => {
    setEditingTeam(team ? { teamSlug: team.slug, currentPermission: team.permission } : null);
    setIsTeamAccessDialogOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!userToDelete) return;
    setIsSubmittingDelete(true);
    try {
      await fetch(`/api/repositories/${owner}/${repo}/collaborators/${userToDelete.login}`, { method: 'DELETE' });
      toast({ title: 'Collaborator Removed' });
      mutateCollaborators();
        setIsAlertOpen(false);
        setUserToDelete(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Removal Failed', description: error.message });
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleTeamRevokeSubmit = async () => {
    if (!teamToRevoke || !orgLogin) return;
    setIsSubmittingRevoke(true);
    try {
      await fetch(`/api/organizations/${orgLogin}/teams/${teamToRevoke.slug}/repositories/${owner}/${repo}`, { method: 'DELETE' });
      toast({ title: "Team Access Revoked" });
      mutateRepoTeams();
      setIsTeamRevokeAlertOpen(false);
      setTeamToRevoke(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
    } finally {
      setIsSubmittingRevoke(false);
    }
};

  if (isLoadingRepoDetails) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
  if (repoDetailsError) return <div className="p-4 text-destructive">Error loading repository details.</div>;

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Repositories
                </Button>
              <div className="flex items-center gap-2">
                <Github className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-2xl">{repoDetails?.full_name}</CardTitle>
              </div>
              <CardDescription className="mt-2">{repoDetails?.description}</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={repoDetails?.html_url || ''} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Go to Repository
              </Link>
                </Button>
        </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
             {/* ... content for repo details ... */}
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Collaborators Card */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div><CardTitle>Individual Access</CardTitle><CardDescription>Manage repository collaborators.</CardDescription></div>
              {canAdminister && <Button size="sm" onClick={() => handleOpenCollaboratorDialog()}><UserPlus className="mr-2 h-4 w-4" /> Add Collaborator</Button>}
            </CardHeader>
            <CardContent>
              {isLoadingCollaborators ? <Skeleton className="h-20 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>User</TableHead><TableHead>Permission</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(collaborators || []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9"><AvatarImage src={c.avatar_url} /><AvatarFallback>{c.login.charAt(0)}</AvatarFallback></Avatar>
                            <span>{c.login}</span>
            </div>
                        </TableCell>
                        <TableCell className="capitalize">{c.role_name}</TableCell>
                        <TableCell className="text-right">
                {canAdminister && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenCollaboratorDialog(c)}><Edit3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => { setUserToDelete(c); setIsAlertOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
               {(collaborators || []).length === 0 && !isLoadingCollaborators && <p className="text-center text-muted-foreground py-4">No individual collaborators found.</p>}
            </CardContent>
          </Card>

          {/* Team Access Card */}
          {isOrgRepo && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div><CardTitle>Team Access</CardTitle><CardDescription>Manage repository access for teams.</CardDescription></div>
                {canAdminister && <Button size="sm" onClick={() => handleOpenTeamDialog()} disabled={isLoadingAllOrgTeams}><PlusCircle className="mr-2 h-4 w-4" /> Grant Team Access</Button>}
              </CardHeader>
              <CardContent>
                {isLoadingRepoTeams ? <Skeleton className="h-20 w-full" /> : (
                <Table>
                    <TableHeader>
                      <TableRow><TableHead>Team</TableHead><TableHead>Permission</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {(repoTeamsAccess || []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.name}</TableCell>
                          <TableCell className="capitalize">{t.permission}</TableCell>
                          <TableCell className="text-right">
                                {canAdminister && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenTeamDialog(t)}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => { setTeamToRevoke(t); setIsTeamRevokeAlertOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                                    </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
                {(repoTeamsAccess || []).length === 0 && !isLoadingRepoTeams && <p className="text-center text-muted-foreground py-4">No teams have access to this repository.</p>}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Code className="mr-2 h-5 w-5" /> Languages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRepoDetails ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                repoDetails && Object.keys(repoDetails.languages).length > 0 ? (
                  <div>
                    <LanguageBar languages={repoDetails.languages} />
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      {Object.entries(repoDetails.languages).map(([lang, bytes]) => (
                        <div key={lang} className="flex items-center">
                          <span className="h-3 w-3 rounded-full mr-1.5" style={{ backgroundColor: languageColor(lang) }}></span>
                          <span>{lang}</span>
                        </div>
                      ))}
                    </div>
                        </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No language information available.</p>
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
               {isLoadingRepoDetails ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                repoDetails && repoDetails.contributors.length > 0 ? (
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {repoDetails.contributors.map(c => (
                         <Tooltip key={c.id}>
                          <TooltipTrigger asChild>
                            <Link href={c.html_url} target="_blank">
                              <Avatar>
                                <AvatarImage src={c.avatar_url} alt={c.login} />
                                <AvatarFallback>{c.login.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{c.login} ({c.contributions} contributions)</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                ) : (
                  <p className="text-sm text-muted-foreground">No contributor information available.</p>
                )
              )}
            </CardContent>
          </Card>
          
          <ActivitySnapshot owner={owner} repo={repo} />
        </div>
      </div>

      {/* Render dialogs conditionally */}
      {isCollaboratorDialogOpen && (
        <ManageCollaboratorDialog
          owner={owner}
          repo={repo}
          isOpen={isCollaboratorDialogOpen}
          onOpenChange={setIsCollaboratorDialogOpen}
          editingUser={editingCollaborator}
          onSuccess={() => mutateCollaborators()}
        />
      )}
      {isTeamAccessDialogOpen && orgLogin && repoDetails && (
        <ManageTeamAccessDialog
          owner={owner}
          repo={repo}
          repoName={repoDetails.name}
          orgLogin={orgLogin}
          isOpen={isTeamAccessDialogOpen}
          onOpenChange={setIsTeamAccessDialogOpen}
          editingTeam={editingTeam}
          allOrgTeams={allOrgTeams || []}
          repoTeamsAccess={repoTeamsAccess || []}
          onSuccess={() => mutateRepoTeams()}
        />
      )}
      
      {/* Alert Dialogs */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Collaborator?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove {userToDelete?.login}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubmit} disabled={isSubmittingDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isTeamRevokeAlertOpen} onOpenChange={setIsTeamRevokeAlertOpen}>
            <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Revoke Team Access?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to revoke access for {teamToRevoke?.name}?</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingRevoke}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTeamRevokeSubmit} disabled={isSubmittingRevoke}>Revoke</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

// Helper component for the language bar
function LanguageBar({ languages }: { languages: Record<string, number> }) {
  const totalBytes = Object.values(languages).reduce((acc, bytes) => acc + bytes, 0);
  if (totalBytes === 0) return null;

  return (
    <div className="w-full h-2.5 rounded-full flex overflow-hidden">
      {Object.entries(languages).map(([lang, bytes]) => {
        const percentage = (bytes / totalBytes) * 100;
        return (
          <div
            key={lang}
            className="h-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: languageColor(lang),
            }}
            title={`${lang}: ${percentage.toFixed(2)}%`}
          />
        );
      })}
    </div>
  );
}

// A simple function to get a color for a language - not exhaustive
function languageColor(lang: string): string {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    Java: '#b07219',
    Shell: '#89e051',
    Go: '#00ADD8',
    C: '#555555',
    'C++': '#f34b7d',
    Ruby: '#701516',
    PHP: '#4F5D95',
    // ... add more as needed
  };
  return colors[lang] || '#cccccc'; // Default color
} 