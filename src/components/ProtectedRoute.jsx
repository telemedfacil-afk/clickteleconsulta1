import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, loading, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    const targetRole = allowedRoles.includes('medico') ? 'medico' : 'paciente';
    const loginPath = `/acesso-${targetRole}`;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
        <div className="w-full flex justify-center items-center py-12">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Acesso Restrito</CardTitle>
                    <CardDescription>
                        Você não tem permissão para acessar esta página.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Esta área é exclusiva para {allowedRoles.join(' ou ')}.
                    </p>
                    <Button variant="destructive" onClick={signOut} className="mt-4">
                      Sair e tentar com outra conta
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return children;
};

export default ProtectedRoute;