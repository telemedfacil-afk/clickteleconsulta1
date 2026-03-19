import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(async (userId, userMeta) => {
    if (!userId) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from('perfis_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data);
      } else {
        // Fallback: monta perfil mínimo a partir dos metadados do token
        setProfile({
          id: userId,
          email: userMeta?.email ?? '',
          full_name: userMeta?.user_metadata?.full_name ?? userMeta?.email ?? '',
          role: userMeta?.user_metadata?.role ?? 'paciente',
        });
      }
    } catch (err) {
      console.error('fetchProfile error:', err);
      // Fallback para não travar na tela de loading
      setProfile({
        id: userId,
        email: userMeta?.email ?? '',
        full_name: userMeta?.user_metadata?.full_name ?? '',
        role: userMeta?.user_metadata?.role ?? 'paciente',
      });
    }
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const u = session?.user ?? null;
    setUser(u);

    if (u) {
      // Fallback imediato dos metadados do token — não bloqueia o loading
      setProfile({
        id: u.id,
        email: u.email ?? '',
        full_name: u.user_metadata?.full_name ?? u.email ?? '',
        role: u.user_metadata?.role ?? 'paciente',
      });
      // Busca assíncrona para enriquecer com dados do banco (sem bloquear)
      fetchProfile(u.id, u);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) handleSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) handleSession(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    profile,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, profile, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};