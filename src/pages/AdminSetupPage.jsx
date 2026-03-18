import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminSetupPage = ({ functionName }) => {
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [errorDetails, setErrorDetails] = useState('');

    useEffect(() => {
        const setupAdmin = async () => {
            if (!functionName) {
                setStatus('error');
                setMessage('Nome da função não especificado.');
                return;
            }
            try {
                const { data, error } = await supabase.functions.invoke(functionName);

                if (error) {
                    // Try to parse the error message if it's a JSON string
                    try {
                        const errorJson = JSON.parse(error.message);
                        if (errorJson.error) {
                             throw new Error(errorJson.error);
                        }
                    } catch (e) {
                       // Not a JSON error, throw original
                    }
                    throw error;
                }
                
                // Specific logic for link-doctor-celso which has a different response structure
                if (functionName === 'link-doctor-celso') {
                     if (data.message) {
                        setStatus('success');
                        setMessage(data.message);
                    } else {
                        throw new Error(data.error || 'Resposta inesperada da função de vínculo.');
                    }
                    return;
                }

                if (data.status === 'exists') {
                    setStatus('exists');
                    setMessage(data.message);
                } else if (data.status === 'ok') {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    throw new Error(data.message || 'Resposta inesperada da função.');
                }

            } catch (error) {
                setStatus('error');
                setMessage('Ocorreu um erro ao executar a configuração.');
                setErrorDetails(error.message || 'Erro desconhecido.');
            }
        };

        setupAdmin();
    }, [functionName]);

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="mt-4 text-muted-foreground">Executando configuração... Por favor, aguarde.</p>
                    </>
                );
            case 'success':
                return (
                    <>
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <p className="mt-4 font-semibold text-foreground">{message}</p>
                        <Button asChild className="mt-6">
                            <Link to="/acesso-medico">Ir para o Login do Médico</Link>
                        </Button>
                    </>
                );
            case 'exists':
                 return (
                    <>
                        <Info className="w-12 h-12 text-blue-500" />
                        <p className="mt-4 font-semibold text-foreground">{message}</p>
                        <p className="text-sm text-muted-foreground">Nenhuma ação foi necessária.</p>
                        <Button asChild className="mt-6">
                            <Link to="/acesso-medico">Ir para o Login do Médico</Link>
                        </Button>
                    </>
                );
            case 'error':
                return (
                    <>
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                        <p className="mt-4 font-semibold text-destructive">{message}</p>
                        <p className="mt-2 text-sm text-muted-foreground bg-secondary p-2 rounded-md">{errorDetails}</p>
                         <Button asChild className="mt-6" variant="secondary">
                            <Link to="/">Voltar para a Home</Link>
                        </Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle>Configuração de Conta de Médico</CardTitle>
                    <CardDescription>
                        Aguarde enquanto preparamos o ambiente para você.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSetupPage;