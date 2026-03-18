import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet';

const HandleApplicationPage = () => {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processando sua decisão...');
    const location = useLocation();

    useEffect(() => {
        const processDecision = async () => {
            const params = new URLSearchParams(location.search);
            const action = params.get('action');
            const token = params.get('token');

            if (!action || !token) {
                setStatus('error');
                setMessage('Parâmetros inválidos. Ação ou token ausente.');
                return;
            }

            try {
                const { data, error } = await supabase.functions.invoke('process-doctor-application', {
                    body: { action, token },
                });

                if (error) throw error;
                
                setStatus(data.success ? 'success' : 'error');
                setMessage(data.message);

            } catch (error) {
                setStatus('error');
                setMessage(error.message || "Ocorreu um erro desconhecido ao processar a solicitação.");
            }
        };

        processDecision();
    }, [location]);

    const renderIcon = () => {
        switch (status) {
            case 'processing':
                return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
            case 'success':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'error':
                return <XCircle className="h-16 w-16 text-destructive" />;
            default:
                return <AlertTriangle className="h-16 w-16 text-yellow-500" />;
        }
    };

    return (
        <>
            <Helmet>
                <title>Processando Solicitação - Click Teleconsulta</title>
            </Helmet>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Processamento de Solicitação</CardTitle>
                        <CardDescription>Aguarde enquanto validamos sua decisão.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
                        {renderIcon()}
                        <p className={`text-lg font-medium ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {message}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default HandleApplicationPage;