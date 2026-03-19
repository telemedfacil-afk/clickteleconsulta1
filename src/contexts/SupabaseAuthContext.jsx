import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

const buildProfileFromUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? user.email ?? '',
    role: user.user_metadata?.role ?? 'paciente',
    image_url: user.user_metadata?.image_url ?? null,
  };
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setProfile(session?.user ? buildProfileFromUser(session.user) : null);
      setLoading(false);

      if (session?.user) {
        supabase
          .from('perfis_usuarios')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfile(buildProfileFromUser(session.user));
        supabase
          .from('perfis_usuarios')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('perfis_usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setProfile(data);
  }, [user]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro no cadastro', description: error.message });
      return { data: null, error };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro no login', description: error.message });
      return { data: null, error };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair', description: error.message });
      return { error };
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    profile,
    reloadProfile,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, profile, reloadProfile, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
