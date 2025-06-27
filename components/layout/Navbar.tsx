'use client';

import Link from 'next/link';
import { ThemeToggleButton } from './ThemeToggleButton';
import { ProfileMenu } from './ProfileMenu';
import { Github } from 'lucide-react';
import { useAppContext } from '@/app/api/contexts/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';

export function Navbar() {
  const {
    availableContexts,
    selectedContext,
    setSelectedContext,
    isLoadingContexts,
    errorContexts: contextLoadingError
  } = useAppContext();

  const handleContextChange = (value: string) => {
    const newSelectedContext = availableContexts.find(ctx => `${ctx.type}-${ctx.login}` === value);
    if (newSelectedContext) {
      setSelectedContext(newSelectedContext);
    }
  };

  const renderContextSwitcher = () => {
    if (isLoadingContexts) {
      return <Skeleton className="h-9 w-40" />;
    }

    if (contextLoadingError) {
      return <span className="text-xs text-destructive truncate" title={contextLoadingError}>Error loading contexts</span>;
    }

    if (selectedContext && availableContexts.length > 0) {
      return (
        <Select
          value={`${selectedContext.type}-${selectedContext.login}`}
          onValueChange={handleContextChange}
        >
          <SelectTrigger className="w-auto min-w-[150px] max-w-[250px] h-9 text-sm">
            <SelectValue placeholder="Select Context...">
              <div className="flex items-center gap-2 truncate">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedContext.avatar_url || undefined} alt={selectedContext.login} />
                  <AvatarFallback>{selectedContext.login.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{selectedContext.name || selectedContext.login}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableContexts.map((ctx) => (
              <SelectItem key={`${ctx.type}-${ctx.login}`} value={`${ctx.type}-${ctx.login}`}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ctx.avatar_url || undefined} alt={ctx.login} />
                    <AvatarFallback>{ctx.login.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {ctx.name || ctx.login}
                  <span className="text-xs text-muted-foreground ml-1">({ctx.type})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null; // Don't render anything if no contexts are loaded or available
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[1550px] mx-auto w-full">
        <nav className="flex h-14 items-center justify-between px-6">
          {/* Left: GitHub icon + brand */}
          <Link href="/" className="flex items-center space-x-2">
            <Github className="h-5 w-5" />
            <span className="font-semibold text-lg">Access Git</span>
          </Link>

          {/* Right: Theme toggle, divider, profile */}
          <div className="flex items-center space-x-4">
            {renderContextSwitcher()}
            <ThemeToggleButton />
            <div className="h-6 w-px bg-border" />
            <ProfileMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}