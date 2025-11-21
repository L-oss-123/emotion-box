import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hasCode = url.searchParams.get('code');
    const hasError = url.searchParams.get('error');

    if (!hasCode || hasError) return;

    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
      if (error) {
        console.error('Exchange code for session failed', error);
        return;
      }

      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setProfile(null);
      return () => {
        active = false;
      };
    }

    const syncProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Fetch profile failed', error);
        return;
      }

      if (!data) {
        const fallbackDisplayName = session.user.user_metadata?.full_name ?? session.user.email ?? '未命名用户';
        const fallbackUsername = session.user.email?.split('@')[0] ?? session.user.id.slice(0, 8);
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            auth_uid: session.user.id,
            display_name: fallbackDisplayName,
            username: fallbackUsername
          })
          .select('id, username, display_name, avatar_url')
          .single();
        if (createError) {
          console.error('Create profile failed', createError);
          return;
        }
        if (active) setProfile(created);
        return;
      }

      if (active) setProfile(data);
    };

    syncProfile();

    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      async signInWithEmail(email: string) {
        await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
      }
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

