'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Users as PeopleIcon, ShieldCheck as TeamIcon, ExternalLink, Eye, Edit } from 'lucide-react';
import { useAppContext } from '@/app/api/contexts/AppContext';

type OrgMember = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
};

type OrgTeam = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  members_count: number;
  repos_count: number;
  html_url: string;
};

type OrgManageParams = {
  orgLogin: string;
};

export default function OrganizationManagePage() {
  const params = useParams() as OrgManageParams;
  const router = useRouter();
  const { orgLogin } = params;
  const { selectedContext } = useAppContext();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [teams, setTeams] = useState<OrgTeam[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgLogin) return;
    setIsLoadingMembers(true);
    setIsLoadingTeams(true);
    setError(null);
    try {
      const [membersRes, teamsRes] = await Promise.all([
        fetch(`/api/organizations/${orgLogin}/members`),
        fetch(`/api/organizations/${orgLogin}/teams`)
      ]);

      if (!membersRes.ok) {
        const errData = await membersRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch members: ${membersRes.statusText}`);
      }
      setMembers(await membersRes.json() || []);

      if (!teamsRes.ok) {
        const errData = await teamsRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch teams: ${teamsRes.statusText}`);
      }
      setTeams(await teamsRes.json() || []);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: "Error Loading Data", description: e.message });
    } finally {
      setIsLoadingMembers(false);
      setIsLoadingTeams(false);
    }
  }, [orgLogin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Repositories
      </Button>

      <h1 className="text-2xl font-semibold text-foreground">
        Manage Organization: <span className="font-mono">{selectedContext?.type === 'org' ? selectedContext.name : orgLogin}</span>
      </h1>

      {error && <p className="text-destructive">Error: {error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* People Section */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              <PeopleIcon className="mr-2 h-5 w-5 text-primary" /> People ({isLoadingMembers ? '...' : members.length})
            </h2>
          </div>
          {isLoadingMembers ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground border border-dashed border-border p-6 text-center rounded-md">
              No members found in this organization.
            </p>
          ) : (
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
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
                        <Button variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/organizations/${orgLogin}/members/${member.login}/access`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View Access
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Teams Section */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              <TeamIcon className="mr-2 h-5 w-5 text-primary" /> Teams ({isLoadingTeams ? '...' : teams.length})
            </h2>
          </div>
          {isLoadingTeams ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : teams.length === 0 ? (
            <p className="text-muted-foreground border border-dashed border-border p-6 text-center rounded-md">
              No teams found in this organization.
            </p>
          ) : (
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map(team => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <Link href={`/organizations/${orgLogin}/teams/${team.slug}/manage`} className="font-medium hover:text-primary">
                          {team.name}
                        </Link>
                        {team.description && (
                          <p className="text-xs text-muted-foreground truncate w-48">{team.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{team.members_count}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/organizations/${orgLogin}/teams/${team.slug}/manage`}>
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Manage
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 