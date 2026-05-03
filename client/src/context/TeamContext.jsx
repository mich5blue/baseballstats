import React, { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTeamBySlug } from '../api/client.js';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const { slug } = useParams();

  const { data: team = null, isLoading, error } = useQuery({
    queryKey: ['team-slug', slug],
    queryFn: () => getTeamBySlug(slug),
    enabled: !!slug,
    retry: false,
  });

  return (
    <TeamContext.Provider value={{ team, teamId: team?.id ?? null, slug, isLoading, notFound: !!error }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}

/** Returns a function that prepends the current team slug to any path */
export function useTeamPath() {
  const { slug } = useContext(TeamContext) || {};
  return (path) => `/${slug}${path}`;
}
