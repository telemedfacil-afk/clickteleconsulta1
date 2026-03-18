import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminCleanupPage = ({ functionName }) => {
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        const runCleanup = async () => {
            if (!functionName) {
                setStatus('error');
                setMessage('Nome da função não especificado.');
                return;
            }
            try {
                const { data, error } = await supabase.functions.invoke(functionName);

                if (error) {
                    throw error;
                }

                setStatus('success');
                setMessage(data.message || 'Operação concluída com sucesso!');
                setDetails(data.details || '');
            } catch (error) {
                setStatus('error');
                setMessage('Ocorreu um erro ao executar a limpeza.');
                setDetails(error.message || 'Erro desconhecido.');
            }
        };

        runCleanup();
    }, [functionName]);

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        Limpeza de Dados
                    </CardTitle>
                    <CardDescription>
                        Executando rotina de manutenção no banco de dados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="mt-4 text-muted-foreground">Limpando perfis duplicados...</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <CheckCircle className="w-12 h-12 text-green-500" />
                            <p className="mt-4 font-semibold text-foreground">{message}</p>
                            {details && <p className="mt-2 text-sm text-muted-foreground">{details}</p>}
                            <Button asChild className="mt-6">
                                <Link to="/agendamentos">Ver Agendamentos</Link>
                            </Button>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <AlertTriangle className="w-12 h-12 text-destructive" />
                            <p className="mt-4 font-semibold text-destructive">{message}</p>
                            <p className="mt-2 text-sm text-muted-foreground bg-secondary p-2 rounded-md">{details}</p>
                             <Button asChild className="mt-6" variant="secondary">
                                <Link to="/">Voltar para a Home</Link>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminCleanupPage;