import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';

const ResetPasswordPage = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const renderForm = useCallback(() => {
        setSessionReady(true);
    }, []);

    useEffect(() => {
        supabase.auth.exchangeCodeForSession(window.location.href)
            .catch(err => console.error("Exchange code error:", err));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
                renderForm();
            }
        });

        renderForm();

        return () => {
            subscription.unsubscribe();
        };
    }, [renderForm]);

    const onSubmit = async (data) => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: data.password });
        setLoading(false);
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao redefinir senha',
                description: error.message || 'Não foi possível atualizar sua senha. Verifique se o link é válido e tente novamente.',
            });
        } else {
            toast({
                title: 'Senha alterada com sucesso!',
                description: 'Você já pode fazer login com sua nova senha.',
            });
            await supabase.auth.signOut();
            navigate('/acesso-paciente?reset=ok');
        }
    };

    const password = watch('password');

    return (
        <>
            <Helmet>
                <title>Redefinir Senha - Click Teleconsulta</title>
                <meta name="description" content="Crie uma nova senha segura para acessar sua conta na Click Teleconsulta." />
            </Helmet>
            <div className="w-full flex justify-center items-center py-12">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Crie sua nova senha</CardTitle>
                        <CardDescription>
                            Escolha uma senha forte com no mínimo 8 caracteres.
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
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
                            </Button>
                        </form>
                    </CardContent>
                     <CardFooter>
                         <Link to="/acesso-paciente" className="text-sm text-primary hover:underline w-full text-center">
                            Lembrou a senha? Voltar para o login
                        </Link>
                     </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default ResetPasswordPage;