import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ChangePasswordPage = () => {
    const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user, profile } = useAuth();
    
    const isRequiredChange = searchParams.get('source') === 'required';

    const onSubmit = async (data) => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ 
            password: data.password,
            data: { require_password_change: false } // Remove the flag
        });
        setLoading(false);

        if (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao alterar senha',
                description: error.message || 'Não foi possível atualizar sua senha. Tente novamente.',
            });
        } else {
            toast({
                title: 'Senha alterada com sucesso!',
                description: isRequiredChange ? 'Seu acesso está liberado.' : '',
            });
            reset();
            const redirectPath = profile?.role === 'medico' ? '/medico/dashboard' : '/paciente/dashboard';
            navigate(redirectPath, { replace: true });
        }
    };

    const password = watch('password');

    return (
        <>
            <Helmet>
                <title>Alterar Senha - Click Teleconsulta</title>
                <meta name="description" content="Altere sua senha de acesso à plataforma Click Teleconsulta." />
            </Helmet>
            <div className="w-full flex justify-center items-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>{isRequiredChange ? 'Crie sua nova senha' : 'Alterar Senha'}</CardTitle>
                        <CardDescription>
                           {isRequiredChange 
                                ? 'Por segurança, você precisa definir uma nova senha para seu primeiro acesso.'
                                : 'Escolha uma nova senha segura para sua conta.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-1 relative">
                                <Label htmlFor="password">Nova Senha</Label>
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    {...register("password", {
                                        required: "Nova senha é obrigatória",
                                        minLength: { value: 8, message: "A senha deve ter no mínimo 8 caracteres" },
                                    })}
                                    placeholder="Mínimo 8 caracteres"
                                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-muted-foreground">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                            </div>
                            <div className="space-y-1 relative">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    {...register("confirmPassword", {
                                        required: "Confirmação é obrigatória",
                                        validate: value => value === password || "As senhas não coincidem"
                                    })}
                                    placeholder="Repita a nova senha"
                                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                                />
                                 <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-8 text-muted-foreground">
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                {!isRequiredChange && (
                                    <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default ChangePasswordPage;