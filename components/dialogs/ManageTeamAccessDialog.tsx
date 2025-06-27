'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

type PermissionValue = 'pull' | 'push' | 'admin' | 'maintain' | 'triage';

type TeamWithRepoAccess = {
  id: number;
  name: string;
  slug: string;
  permission: PermissionValue;
};

type OrgTeamSimple = {
  id: number;
  name: string;
  slug: string;
};

interface ManageTeamAccessDialogProps {
  owner: string;
  repo: string;
  repoName: string;
  orgLogin: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingTeam: { teamSlug: string; currentPermission: PermissionValue } | null;
  allOrgTeams: OrgTeamSimple[];
  repoTeamsAccess: TeamWithRepoAccess[];
  onSuccess: () => void;
}

export function ManageTeamAccessDialog({
  owner,
  repo,
  repoName,
  orgLogin,
  isOpen,
  onOpenChange,
  editingTeam,
  allOrgTeams,
  repoTeamsAccess,
  onSuccess,
}: ManageTeamAccessDialogProps) {
  const [selectedTeamSlugForGrant, setSelectedTeamSlugForGrant] = useState<string>('');
  const [teamPermissionInput, setTeamPermissionInput] = useState<PermissionValue>('pull');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTeams = allOrgTeams.filter(
    (orgTeam) => !repoTeamsAccess.some((repoTeam) => repoTeam.slug === orgTeam.slug)
  );

  useEffect(() => {
    if (isOpen) {
      if (editingTeam) {
        setSelectedTeamSlugForGrant(editingTeam.teamSlug);
        setTeamPermissionInput(editingTeam.currentPermission);
      } else {
        if (availableTeams.length > 0) {
          setSelectedTeamSlugForGrant(availableTeams[0].slug);
        } else {
          setSelectedTeamSlugForGrant('');
        }
        setTeamPermissionInput('pull');
      }
    }
  }, [editingTeam, isOpen, availableTeams]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamSlug = editingTeam ? editingTeam.teamSlug : selectedTeamSlugForGrant;
    if (!teamSlug) {
      toast({ variant: 'destructive', title: 'No Team Selected' });
      return;
    }
    setIsSubmitting(true);

    try {
      await fetch(`/api/organizations/${orgLogin}/teams/${teamSlug}/repositories/${owner}/${repo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: teamPermissionInput }),
      });
      
      toast({
        title: "Team Access Updated",
        description: `Team '${teamSlug}' now has '${teamPermissionInput}' permission.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message || "Could not update team's access.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTeam ? `Edit Access for Team: ${editingTeam.teamSlug}` : 'Grant Repository Access to Team'}</DialogTitle>
          <DialogDescription>
            Select a team and the permission level they should have on <span className="font-mono">{repoName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="grid gap-4 py-4">
            {!editingTeam && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamSlugSelect" className="text-right text-muted-foreground">Team</Label>
                <Select
                  value={selectedTeamSlugForGrant}
                  onValueChange={setSelectedTeamSlugForGrant}
                  disabled={isSubmitting || availableTeams.length === 0}
                >
                  <SelectTrigger id="teamSlugSelect" className="col-span-3 bg-background border-input">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.length === 0 && <SelectItem value="no-teams" disabled>No available teams</SelectItem>}
                    {availableTeams.map(team => (
                      <SelectItem key={team.slug} value={team.slug}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamPermission" className="text-right text-muted-foreground">Permission</Label>
              <Select
                value={teamPermissionInput}
                onValueChange={(value: string) => setTeamPermissionInput(value as PermissionValue)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="teamPermission" className="col-span-3 bg-background border-input">
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">Read (Pull)</SelectItem>
                  <SelectItem value="triage">Triage</SelectItem>
                  <SelectItem value="push">Write (Push)</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || (!editingTeam && !selectedTeamSlugForGrant)}>
              {isSubmitting && (
                 <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              )}
              {editingTeam ? 'Update Permission' : 'Grant Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 