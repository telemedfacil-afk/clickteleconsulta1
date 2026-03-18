import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useNavigate } from 'react-router-dom';
import { useLoader } from '@/contexts/LoaderContext';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const appointmentsContext = useAppointments(); 
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enhanced profile fetch with better retry logic for new signups
  const fetchProfile = useCallback(async (userId, retries = 3, delay = 1000) => {
    if (!userId) return null;
    
    for (let i = 0; i < retries; i++) {
        try {
            const { data, error } = await supabase
                .from('perfis_usuarios')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                if (!error.message?.includes('Failed to fetch')) {
                    console.warn(`Auth context profile fetch error (attempt ${i+1}):`, error);
                }
                if (i === retries - 1) return null;
            } else if (data) {
                return data;
            }
        } catch (err) {
            console.warn(`Profile fetch exception:`, err);
        }

        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, delay));
        }
    }
    
    return null;
  }, []);

  const signOutAndClear = useCallback(async (options = {}) => {
    const redirect = options.redirect ?? true;
    const scope = options.scope || 'local'; 

    try {
        showLoader();
        
        // Attempt standard sign out
        const { error } = await supabase.auth.signOut({ scope });
        if (error) {
            console.warn('Supabase signOut error (ignoring):', error.message);
        }
    } catch (e) {
        console.warn('Silent exception during sign out:', e);
    } finally {
      // Manual cleanup regardless of API error
      try {
          Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                  localStorage.removeItem(key);
              }
          });
      } catch (e) {
          console.warn('Error clearing local storage:', e);
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      
      if(appointmentsContext?.clearAppointments) {
          appointmentsContext.clearAppointments();
      }
      
      if (redirect) {
          setTimeout(() => {
              hideLoader();
              navigate('/');
          }, 1000);
      } else {
          hideLoader();
      }
    }
  }, [navigate, appointmentsContext, showLoader, hideLoader]);

  // Robust Auth Initialization
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
        try {
            const { data: { session: localSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.warn("Error getting session:", sessionError);
                if (!sessionError.message?.includes('Failed to fetch')) {
                    if (mounted) await signOutAndClear({ redirect: false, scope: 'local' });
                }
                return;
            }

            if (localSession) {
                const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();
                
                if (userError || !serverUser) {
                    const isSessionError = userError && (
                        userError.code === 'session_not_found' || 
                        userError.message?.includes('Session from session_id claim') ||
                        userError.status === 403
                    );

                    const isNetworkError = userError?.message?.includes('Failed to fetch') || 
                                         userError?.name === 'AuthRetryableFetchError';

                    if (isSessionError) {
                        console.warn('Session invalid on server, clearing.');
                        if (mounted) await signOutAndClear({ redirect: false, scope: 'local' });
                    } else if (isNetworkError) {
                        console.warn('Network error verifying user, keeping local session.');
                        if (mounted) {
                            setSession(localSession);
                            setUser(localSession.user);
                            const profileData = await fetchProfile(localSession.user.id, 1);
                            setProfile(profileData);
                        }
                    } else {
                         console.error('Get user error:', userError);
                         if (mounted) await signOutAndClear({ redirect: false });
                    }
                } else {
                    if (mounted) {
                        setSession(localSession);
                        setUser(serverUser); 
                        
                        const profileData = await fetchProfile(serverUser.id, serverUser.email_confirmed_at ? 3 : 2);
                        setProfile(profileData);
                        
                        if (serverUser.email_confirmed_at && localSession.user?.email_confirmed_at === null) {
                             const { data: refreshedData } = await supabase.auth.refreshSession();
                             if (refreshedData.session) setSession(refreshedData.session);
                        }

                        if (serverUser.user_metadata?.require_password_change) {
                            navigate('/conta/alterar-senha?source=required');
                        }
                    }
                }
            } else {
                if (mounted) setLoading(false);
            }
        } catch (err) {
            console.error("Auth init exception:", err);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const currentUser = currentSession?.user ?? null;
        setSession(currentSession);
        setUser(currentUser);
        
        let profileData = null;

        if (currentUser) {
            const retries = (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') ? 5 : 2;
            profileData = await fetchProfile(currentUser.id, retries);
            
            const isJustConfirmed = event === 'SIGNED_IN' && 
                                  currentUser.email_confirmed_at && 
                                  (Date.now() - new Date(currentUser.email_confirmed_at).getTime() < 60000);

            if (isJustConfirmed && profileData) {
                toast({
                    title: 'E-mail confirmado com sucesso!',
                    description: 'Sua conta foi ativada. Bem-vindo!',
                    variant: "success"
                });
            } else if (event === 'SIGNED_IN' && profileData) {
                 if (!isJustConfirmed) {
                     toast({
                        id: 'welcome_toast',
                        title: 'Login realizado com sucesso!',
                        description: `Bem-vindo, ${profileData.full_name?.split(' ')[0] || 'Usuário'}.`,
                    });
                 }
            }

            setProfile(profileData);

            if (currentUser?.user_metadata?.require_password_change) {
                navigate('/conta/alterar-senha?source=required');
            }
        } else {
            setProfile(null);
        }

        setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, signOutAndClear, toast, navigate]);
  
  const reloadProfile = useCallback(async () => {
    if (user?.id) {
      const currentProfile = profile;
      const profileData = await fetchProfile(user.id, 3);
      if (profileData && JSON.stringify(profileData) !== JSON.stringify(currentProfile)) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile, profile]);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    const redirectUrl = `${window.location.origin}/acesso-paciente`;
    
    let userMetadata = {};
    if (metadata.data && typeof metadata.data === 'object') {
        userMetadata = { ...metadata.data };
    } else {
        userMetadata = { ...metadata };
    }

    ['full_name', 'cpf', 'whatsapp', 'role', 'data_nasc'].forEach(key => {
        if (metadata[key] !== undefined && userMetadata[key] === undefined) {
            userMetadata[key] = metadata[key];
        }
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
         const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
              emailRedirectTo: redirectUrl
            }
         });

         if (resendError) {
             toast({
                variant: "destructive",
                title: "Falha no Cadastro",
                description: "Este e-mail já existe. Tente fazer login.",
            });
         } else {
            return { user: null, session: null, error: { message: 'resend_successful' } };
         }

      } else {
        toast({
            variant: "destructive",
            title: "Falha no Cadastro",
            description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        });
      }
      return { user: null, session: null, error };
    }
    
    return { user: data.user, session: data.session, error: null };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

     if (error) {
        let description = "Email ou senha inválidos.";
        if (error.message.includes("Email not confirmed")) {
            description = "Verifique sua caixa de entrada para confirmar seu e-mail."
        }
        toast({
            variant: "destructive",
            title: "Falha no Login",
            description: description
        });
       return { user: null, session: null, error };
    }
    
    return { user: data.user, session: data.session, error: null };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    reloadProfile,
    signUp,
    signIn,
    signOut: signOutAndClear,
  }), [user, session, profile, loading, reloadProfile, signUp, signIn, signOutAndClear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};