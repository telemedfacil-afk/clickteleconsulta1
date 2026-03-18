import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useLoader } from '@/contexts/LoaderContext';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      navigate('/admin/dashboard/agendamentos');
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showLoader();

    try {
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Check role after login
      const { data: profileCheck } = await supabase
        .from('perfis_usuarios')
        .select('role')
        .eq('email', email)
        .single();
        
      if (profileCheck?.role !== 'admin') {
        throw new Error('Acesso não autorizado. Apenas administradores.');
      }

      navigate('/admin/dashboard/agendamentos');
      setTimeout(() => {
        hideLoader();
      }, 1000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de acesso',
        description: error.message || 'Credenciais inválidas ou sem permissão.',
      });
      // Force sign out if login succeeded but role check failed
      await supabase.auth.signOut();
      hideLoader();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    setIsSettingUp(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-admin-user');
        if (error) throw error;
        toast({
            title: 'Configuração concluída',
            description: 'Conta de administrador criada/atualizada. Tente logar.',
            variant: 'success'
        });
        // Credenciais removidas por segurança — preencha manualmente após setup
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro na configuração',
            description: error.message
        });
    } finally {
        setIsSettingUp(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
              <Lock className="w-8 h-8 text-slate-100" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Acesso Administrativo</CardTitle>
          <CardDescription className="text-slate-400">
            Área restrita para gestão da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-slate-700"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white focus:ring-slate-700"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-white text-slate-950 hover:bg-slate-200 font-semibold" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-900 pt-6">
            <Button variant="link" className="text-slate-500 text-xs" onClick={handleSetupAdmin} disabled={isSettingUp}>
                {isSettingUp ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                Inicializar Admin (Primeiro Acesso)
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLoginPage;