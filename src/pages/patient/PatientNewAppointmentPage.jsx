import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

const PatientNewAppointmentPage = () => {
    const { profile, loading } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!profile) {
        return (
            <Card className="bg-destructive/10 border-destructive">
                <CardHeader className="flex flex-row items-center gap-4">
                    <AlertCircle className="w-8 h-8 text-destructive"/>
                    <div>
                        <CardTitle>Perfil não encontrado</CardTitle>
                        <CardDescription className="text-destructive">
                            Não foi possível carregar seus dados. Por favor, tente recarregar a página ou entre em contato com o suporte.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Agendar Nova Consulta</CardTitle>
                    <CardDescription>
                        Pronto para sua próxima consulta? Escolha um de nossos especialistas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Clique no botão abaixo para ver a lista de médicos e agendar sua teleconsulta.</p>
                    <Button size="lg" onClick={() => navigate('/agendamentos')}>
                        Ver Médicos e Agendar
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default PatientNewAppointmentPage;