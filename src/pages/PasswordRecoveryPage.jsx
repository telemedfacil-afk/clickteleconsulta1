import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';

const PasswordRecoveryPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { toast } = useToast();

    const onSubmit = async ({ email }) => {
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        setLoading(false);
        if (error) {
            toast({
                variant: "destructive",
                title: "Erro ao enviar e-mail",
                description: "Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.",
            });
        } else {
            setSubmitted(true);
        }
    };

    return (
        <>
            <Helmet>
                <title>Recuperar Senha - Click Teleconsulta</title>
                <meta name="description" content="Recupere o acesso à sua conta na Click Teleconsulta. Insira seu e-mail para receber um link de redefinição de senha." />
            </Helmet>
            <div className="w-full flex justify-center items-center py-12">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Recuperar Senha</CardTitle>
                        <CardDescription>
                            {submitted 
                                ? "Verifique sua caixa de entrada (e spam)." 
                                : "Insira seu e-mail para receber um link para redefinir sua senha."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submitted ? (
                            <div className="text-center py-8">
                                <MailCheck className="w-16 h-16 mx-auto text-green-500"/>
                                <p className="mt-4 text-muted-foreground">
                                    Se uma conta com este e-mail existir, um link de recuperação foi enviado.
                                </p>
                             </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register("email", {
                                            required: "E-mail é obrigatório",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Endereço de e-mail inválido"
                                            }
                                        })}
                                        placeholder="seu@email.com"
                                        className={errors.email ? 'border-destructive' : ''}
                                    />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Link de Recuperação'}
                                 </Button>
                            </form>
                        )}
                    </CardContent>
                     <CardFooter>
                         <Link to="/acesso-paciente" className="text-sm text-primary hover:underline w-full text-center">
                            Voltar para o login
                        </Link>
                     </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default PasswordRecoveryPage;