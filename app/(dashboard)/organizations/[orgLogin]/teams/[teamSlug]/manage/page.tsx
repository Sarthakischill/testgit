'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Users as MembersIcon, FolderGit2 as ReposIcon, ExternalLink, Lock, Plus, Edit2, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

type TeamMember = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
};

type TeamRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  permissions: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
  html_url: string;
  owner: { login: string; };
  description: string | null;
};

type TeamManageParams = {
  orgLogin: string;
  teamSlug: string;
};

type RepositoryAccessDialogState = {
  isOpen: boolean;
  repoName: string;
  permission: string;
  isEditing: boolean;
  currentRepo?: TeamRepository;
};

type AlertDialogState = {
  isOpen: boolean;
  repoToRevoke?: TeamRepository;
};

export default function ManageTeamPage() {
  const params = useParams() as TeamManageParams;
  const router = useRouter();
  const { orgLogin, teamSlug } = params;

  const [teamName, setTeamName] = useState(teamSlug);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [repositories, setRepositories] = useState<TeamRepository[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [repoDialog, setRepoDialog] = useState<RepositoryAccessDialogState>({
    isOpen: false,
    repoName: '',
    permission: 'pull',
    isEditing: false,
  });

  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({
    isOpen: false,
  });

  // State for Add/Edit Member Dialog
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberUsernameInput, setMemberUsernameInput] = useState('');
  const [memberRoleInput, setMemberRoleInput] = useState<'member' | 'maintainer'>('member');
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  // State for Remove Member Alert
  const [isMemberRemoveAlertOpen, setIsMemberRemoveAlertOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const [isSubmittingMemberAction, setIsSubmittingMemberAction] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!orgLogin || !teamSlug) return;
    setIsLoadingMembers(true);
    setIsLoadingRepos(true);
    setError(null);
    try {
      const [membersRes, reposRes] = await Promise.all([
        fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/members`),
        fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/repositories`)
      ]);

      if (!membersRes.ok) throw new Error(`Failed to fetch members: ${(await membersRes.json()).error || membersRes.statusText}`);
      setMembers(await membersRes.json() || []);
      setIsLoadingMembers(false);

      if (!reposRes.ok) throw new Error(`Failed to fetch repositories: ${(await reposRes.json()).error || reposRes.statusText}`);
      setRepositories(await reposRes.json() || []);
      setIsLoadingRepos(false);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: "Error", description: e.message });
      setIsLoadingMembers(false);
      setIsLoadingRepos(false);
    }
  }, [orgLogin, teamSlug]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleGrantAccess = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/repositories/${orgLogin}/${repoDialog.repoName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: repoDialog.permission }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update repository access');
      }

      toast({ title: "Success", description: "Repository access updated successfully" });
      fetchTeamData(); // Refresh the data
      setRepoDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!alertDialog.repoToRevoke) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgLogin}/teams/${teamSlug}/repositories/${alertDialog.repoToRevoke.owner.login}/${alertDialog.repoToRevoke.name}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke repository access');
      }

      toast({ title: "Success", description: "Repository access revoked successfully" });
      fetchTeamData(); // Refresh the data
      setAlertDialog({ isOpen: false });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPermissionFromRepo = (repo: TeamRepository): string => {
    if (repo.permissions.admin) return 'admin';
    if (repo.permissions.maintain) return 'maintain';
    if (repo.permissions.push) return 'push';
    if (repo.permissions.triage) return 'triage';
    return 'pull';
  };

  const isLoading = isLoadingMembers || isLoadingRepos;

  const handleOpenMemberForm = (member?: TeamMember) => {
    if (member) {
      setEditingTeamMember(member);
      setMemberUsernameInput(member.login);
      setMemberRoleInput('member'); // Default, or fetch actual role if needed
    } else {
      setEditingTeamMember(null);
      setMemberUsernameInput('');
      setMemberRoleInput('member');
    }
    setIsMemberFormOpen(true);
  };

  const handleMemberFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUsernameInput) {
      toast({ variant: "destructive", title: "Validation Error", description: "GitHub username is required." });
      return;
    }
    setIsSubmittingMemberAction(true);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/members/${memberUsernameInput}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: memberRoleInput }),
      });
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${editingTeamMember ? 'update role for' : 'add'} member (Status: ${response.status})`);
      }
      toast({ title: "Success", description: `User ${memberUsernameInput} ${editingTeamMember ? 'role updated' : 'added to team'} ${responseData.state === 'pending' ? '(invitation pending)' : ''}.` });
      setIsMemberFormOpen(false);
      fetchTeamData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: e.message });
    } finally {
      setIsSubmittingMemberAction(false);
    }
  };

  const handleOpenMemberRemoveAlert = (member: TeamMember) => {
    setMemberToRemove(member);
    setIsMemberRemoveAlertOpen(true);
  };

  const handleMemberRemoveSubmit = async () => {
    if (!memberToRemove) return;
    setIsSubmittingMemberAction(true);
    try {
      const response = await fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/members/${memberToRemove.login}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to remove member (Status: ${response.status})`);
      }
      toast({ title: "Success", description: `User ${memberToRemove.login} removed from team.` });
      setIsMemberRemoveAlertOpen(false);
      setMemberToRemove(null);
      fetchTeamData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: e.message });
    } finally {
      setIsSubmittingMemberAction(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push(`/organizations/${orgLogin}/manage`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organization
      </Button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Manage Team: <span className="font-mono">{teamName}</span>
        </h1>
      </div>

      {error && <p className="text-destructive">Error: {error}</p>}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
          <TabsTrigger value="members"><MembersIcon className="mr-2 h-4 w-4 inline-block" />Members</TabsTrigger>
          <TabsTrigger value="repositories"><ReposIcon className="mr-2 h-4 w-4 inline-block" />Repositories</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members ({members.length})</CardTitle>
              <Button size="sm" onClick={() => handleOpenMemberForm()}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Member
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMembers ? <Skeleton className="h-20 w-full" /> : members.length === 0 ? (
                <p className="text-muted-foreground">No members in this team.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Username</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Link href={member.html_url} target="_blank" className="flex items-center hover:text-primary group">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback>{member.login.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {member.login}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-50 group-hover:opacity-100"/>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" size="sm" onClick={() => handleOpenMemberRemoveAlert(member)} className="h-8 px-2 sm:px-3">
                            <UserMinus className="mr-0 sm:mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repositories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Repositories with Access ({repositories.length})</CardTitle>
              <Button onClick={() => setRepoDialog({
                isOpen: true,
                repoName: '',
                permission: 'pull',
                isEditing: false,
              })}>
                <Plus className="mr-2 h-4 w-4" /> Grant Repository Access
              </Button>
              <Dialog open={repoDialog.isOpen} onOpenChange={(open) => setRepoDialog(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{repoDialog.isEditing ? 'Edit Repository Access' : 'Grant Repository Access'}</DialogTitle>
                    <DialogDescription>
                      {repoDialog.isEditing 
                        ? "Modify this team's access level to the repository."
                        : "Grant this team access to a repository in the organization."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="repo-name">Repository Name</Label>
                      <Input
                        id="repo-name"
                        value={repoDialog.repoName}
                        onChange={(e) => setRepoDialog(prev => ({ ...prev, repoName: e.target.value }))}
                        placeholder="repository-name"
                        disabled={repoDialog.isEditing || isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="permission">Permission Level</Label>
                      <Select
                        value={repoDialog.permission}
                        onValueChange={(value) => setRepoDialog(prev => ({ ...prev, permission: value }))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pull">Read</SelectItem>
                          <SelectItem value="triage">Triage</SelectItem>
                          <SelectItem value="push">Write</SelectItem>
                          <SelectItem value="maintain">Maintain</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRepoDialog(prev => ({ ...prev, isOpen: false }))} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleGrantAccess} disabled={!repoDialog.repoName || isSubmitting}>
                      {isSubmitting ? 'Saving...' : repoDialog.isEditing ? 'Update Access' : 'Grant Access'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingRepos ? <Skeleton className="h-20 w-full" /> : repositories.length === 0 ? (
                <p className="text-muted-foreground">This team has no explicit repository access.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repositories.map(repo => (
                      <TableRow key={repo.id}>
                        <TableCell>
                          <Link href={repo.html_url} target="_blank" className="flex items-center hover:text-primary group">
                            {repo.private && <Lock className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover:text-primary" />}
                            {repo.full_name}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-50 group-hover:opacity-100"/>
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {repo.permissions.admin ? 'Admin' : repo.permissions.maintain ? 'Maintain' : repo.permissions.push ? 'Write' : repo.permissions.triage ? 'Triage' : repo.permissions.pull ? 'Read' : 'Custom'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setRepoDialog({
                              isOpen: true,
                              repoName: repo.name,
                              permission: getPermissionFromRepo(repo),
                              isEditing: true,
                              currentRepo: repo,
                            })}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit Access</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setAlertDialog({ isOpen: true, repoToRevoke: repo })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            <span className="sr-only">Revoke Access</span>
                          </Button>
                          <AlertDialog open={alertDialog.isOpen} onOpenChange={(open) => setAlertDialog({ isOpen: open })}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Repository Access</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke this team's access to <span className="font-medium">{repo.full_name}</span>?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleRevokeAccess}
                                  disabled={isSubmitting}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {isSubmitting ? 'Revoking...' : 'Revoke Access'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Member Dialog */}
      <Dialog open={isMemberFormOpen} onOpenChange={!isSubmittingMemberAction ? setIsMemberFormOpen : undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeamMember ? `Edit Role for ${editingTeamMember.login}` : 'Add Member to Team'}</DialogTitle>
            <DialogDescription>
              {editingTeamMember ? `Update role for ${editingTeamMember.login} in this team.` : 'Enter the GitHub username of the organization member to add to this team.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMemberFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="memberUsername" className="text-right text-muted-foreground">Username</Label>
                <Input
                  id="memberUsername"
                  value={memberUsernameInput}
                  onChange={(e) => setMemberUsernameInput(e.target.value)}
                  className="col-span-3"
                  placeholder="GitHub username"
                  disabled={!!editingTeamMember || isSubmittingMemberAction}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="memberRole" className="text-right text-muted-foreground">Team Role</Label>
                <Select value={memberRoleInput} onValueChange={(value) => setMemberRoleInput(value as 'member' | 'maintainer')} disabled={isSubmittingMemberAction}>
                  <SelectTrigger id="memberRole" className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="maintainer">Maintainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingMemberAction}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmittingMemberAction}>
                {isSubmittingMemberAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTeamMember ? 'Update Role' : 'Add to Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Alert Dialog */}
      <AlertDialog open={isMemberRemoveAlertOpen} onOpenChange={!isSubmittingMemberAction ? setIsMemberRemoveAlertOpen : undefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold">{memberToRemove?.login}</span> from the team <span className="font-mono">{teamName}</span>.
              They may lose access to repositories granted via this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingMemberAction} onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMemberRemoveSubmit}
              disabled={isSubmittingMemberAction}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmittingMemberAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 