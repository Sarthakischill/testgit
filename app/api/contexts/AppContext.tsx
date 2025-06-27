// contexts/AppContext.tsx
'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import type { ContextItem } from '@/app/api/contexts/route'; // Adjust path

interface AppContextType {
  availableContexts: ContextItem[];
  selectedContext: ContextItem | null;
  setSelectedContext: Dispatch<SetStateAction<ContextItem | null>>;
  isLoadingContexts: boolean;
  errorContexts: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [availableContexts, setAvailableContexts] = useState<ContextItem[]>([]);
  const [selectedContext, setSelectedContext] = useState<ContextItem | null>(null);
  const [isLoadingContexts, setIsLoadingContexts] = useState(true);
  const [errorContexts, setErrorContexts] = useState<string | null>(null);

  useEffect(() => {
    const fetchContexts = async () => {
      setIsLoadingContexts(true);
      setErrorContexts(null);
      try {
        const response = await fetch('/api/contexts');
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch contexts from API');
        }
        const data: ContextItem[] = await response.json();
        setAvailableContexts(data);

        if (data.length > 0) {
          // Prioritize selecting the 'user' context first if it exists
          const userContext = data.find(ctx => ctx.type === 'user');
          if (userContext) {
            setSelectedContext(userContext);
          } else {
            // Otherwise, select the first available context (likely an org)
            setSelectedContext(data[0]);
          }
        } else {
          setErrorContexts("No user or organization contexts found. Check PAT scopes (read:user, read:org).");
        }
      } catch (error: any) {
        console.error("Error in AppProvider fetching contexts:", error);
        setErrorContexts(error.message || "An unknown error occurred while fetching contexts.");
      } finally {
        setIsLoadingContexts(false);
      }
    };
    fetchContexts();
  }, []);

  return (
    <AppContext.Provider value={{ availableContexts, selectedContext, setSelectedContext, isLoadingContexts, errorContexts }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};