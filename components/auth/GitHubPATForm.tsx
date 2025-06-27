'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key } from 'lucide-react';
import { setPAT, clearPAT, getPAT } from '@/lib/auth';

export function GitHubPATForm() {
  const [pat, setPATState] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Load PAT from localStorage on component mount
    const storedPat = getPAT();
    if (storedPat) {
      setPATState(storedPat);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate PAT by making a test API call
      const response = await fetch('/api/auth/validate-pat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pat }),
      });

      if (!response.ok) {
        throw new Error('Invalid GitHub Personal Access Token');
      }

      // Store PAT
      setPAT(pat);

      toast({
        title: "Success",
        description: "GitHub Personal Access Token has been saved.",
      });

      // Reload the page to refresh all components with new PAT
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to validate GitHub Personal Access Token",
      });
    }
  };

  const handleClear = () => {
    clearPAT();
    setPATState('');
    toast({
      title: "Success",
      description: "GitHub Personal Access Token has been cleared.",
    });
    // Reload the page to refresh all components
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pat">GitHub Personal Access Token</Label>
        <div className="relative">
          <Input
            id="pat"
            type="password"
            value={pat}
            onChange={(e) => setPATState(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="pr-10"
          />
          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">
          Your token will be stored securely in your browser's local storage and cookies.
        </p>
      </div>
      <div className="flex space-x-2">
        <Button type="submit" className="flex-1">
          Save Token
        </Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear Token
        </Button>
      </div>
    </form>
  );
} 