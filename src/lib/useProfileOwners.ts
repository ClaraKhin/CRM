import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ProfileOwner = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  initials: string;
};

const FALLBACK: ProfileOwner[] = [
  { id: 'o1', name: 'Renee Walker', color: '#ffdccb', textColor: '#8c5535', initials: 'RW' },
  { id: 'o2', name: 'Marcus Chen', color: '#d8e7ff', textColor: '#2d4fa3', initials: 'MC' },
  { id: 'o3', name: 'Priya Nair', color: '#eadbff', textColor: '#6b35a8', initials: 'PN' },
  { id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3', textColor: '#1a6b4a', initials: 'DA' },
];

const PROFILE_SYNC_EVENT = 'profiles-updated';

export function dispatchProfilesUpdated() {
  window.dispatchEvent(new CustomEvent(PROFILE_SYNC_EVENT));
}

export function useProfileOwners() {
  const [owners, setOwners] = useState<ProfileOwner[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_color');
    if (data && data.length > 0) {
      setOwners(data.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        color: p.avatar_color ?? '#d8e7ff',
        textColor: '#46506a',
        initials: p.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join(''),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(PROFILE_SYNC_EVENT, handler);
    return () => window.removeEventListener(PROFILE_SYNC_EVENT, handler);
  }, [load]);

  return { owners, loading, reload: load };
}

export function ownerById(owners: ProfileOwner[], id: string): ProfileOwner {
  const found = owners.find((o) => o.id === id);
  if (found) return found;
  const fallback = FALLBACK.find((o) => o.id === id);
  if (fallback) return fallback;
  return { id, name: 'Unassigned', color: '#f0f2f5', textColor: '#6b7488', initials: '?' };
}
