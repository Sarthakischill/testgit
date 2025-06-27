'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GitHubPATForm } from '@/components/auth/GitHubPATForm';
import { Loader2, User } from 'lucide-react';
import Link from 'next/link';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

export function ProfileMenu() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPATDialog, setShowPATDialog] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const pat = localStorage.getItem('github_pat');
      if (!pat) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/validate-pat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pat }),
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('github_pat');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        localStorage.removeItem('github_pat');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  if (!user) {
    return (
      <>
        <Button variant="ghost" size="icon" onClick={() => setShowPATDialog(true)}>
          <User className="h-5 w-5" />
        </Button>
        <Dialog open={showPATDialog} onOpenChange={setShowPATDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>GitHub Authentication</DialogTitle>
            </DialogHeader>
            <GitHubPATForm />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || user.login}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.login}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={user.html_url} target="_blank" rel="noopener noreferrer">
              GitHub Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowPATDialog(true)}>
            Manage PAT
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showPATDialog} onOpenChange={setShowPATDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage GitHub PAT</DialogTitle>
          </DialogHeader>
          <GitHubPATForm />
        </DialogContent>
      </Dialog>
    </>
  );
} 