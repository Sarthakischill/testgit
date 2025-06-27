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
import { Input } from '@/components/ui/input';
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

type Collaborator = {
  id: number;
  login: string;
  avatar_url: string;
  role_name: string;
};

interface ManageCollaboratorDialogProps {
  owner: string;
  repo: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingUser: { login: string; permission: PermissionValue } | null;
  onSuccess: () => void;
}

export function ManageCollaboratorDialog({
  owner,
  repo,
  isOpen,
  onOpenChange,
  editingUser,
  onSuccess,
}: ManageCollaboratorDialogProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [permissionInput, setPermissionInput] = useState<PermissionValue>('pull');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setUsernameInput(editingUser.login);
      setPermissionInput(editingUser.permission);
    } else {
      setUsernameInput('');
      setPermissionInput('pull');
    }
  }, [editingUser, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/repositories/${owner}/${repo}/collaborators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, permission: permissionInput }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit.');
      }
      
      toast({
        title: `Success!`,
        description: `${editingUser ? 'Updated' : 'Added'} ${usernameInput} as a collaborator.`,
      });

      onSuccess(); // This will call mutateCollaborators from the parent
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Edit Collaborator' : 'Add Collaborator'}</DialogTitle>
          <DialogDescription>
            {editingUser
              ? "Modify this collaborator's access level."
              : 'Add a new collaborator to this repository.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">GitHub Username</Label>
              <Input
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g., octocat"
                disabled={!!editingUser || isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission">Permission Level</Label>
              <Select
                value={permissionInput}
                onValueChange={(value) => setPermissionInput(value as PermissionValue)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="permission">
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">Read</SelectItem>
                  <SelectItem value="push">Write</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="triage">Triage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {editingUser ? 'Save Changes' : 'Add Collaborator'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 