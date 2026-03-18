import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, User, Stethoscope, Calendar, Clock, DollarSign, Download, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';
import QRCode from 'qrcode.react';

const GuideViewerPage = () => {
    const { guideId } = useParams();
    const navigate = useNavigate();
    const { getGuideById } = useAppointments();
    const { toast } = useToast();
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGuide = async () => {
            setLoading(true);
            const { data, error } = await getGuideById(guideId);
            if (error || !data) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao buscar guia',
                    description: 'Não foi possível encontrar os detalhes da guia solicitada.',
                });
                navigate(-1); // Go back to the previous page
            } else {
                setGuide(data);
            }
            setLoading(false);
        };

        if (guideId) {
            fetchGuide();
        }
    }, [guideId, getGuideById, navigate, toast]);

    const handleDownload = () => {
        toast({
            title: "Em desenvolvimento",
            description: "A funcionalidade de download do PDF estará disponível em breve."
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <h1 className="text-2xl font-semibold">Carregando Guia de Agendamento...</h1>
            </div>
        );
    }

    if (!guide) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold">Guia não encontrada</h3>
                <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar os dados da guia.</p>
                <Button onClick={() => navigate(-1)} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
            </div>
        );
    }

    const { paciente_snapshot: patient, medico_snapshot: doctor, servico_snapshot: service, protocolo, data_emissao } = guide;

    return (
        <>
            <Helmet>
                <title>Guia de Agendamento: {protocolo} - Click Teleconsulta</title>
            </Helmet>
            <div className="max-w-4xl mx-auto">
                <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Card className="w-full border-primary/20 shadow-lg">
                    <CardHeader className="bg-primary/5 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                                    <FileText /> Guia de Agendamento de Teleconsulta
                                </CardTitle>
                                <CardDescription>Protocolo: {protocolo}</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">Click Teleconsulta</p>
                                <p className="text-xs text-muted-foreground">Data de Emissão: {new Date(data_emissao).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><User /> Dados do Paciente</h3>
                                <div className="pl-6 border-l-2 border-primary/20 space-y-1 text-sm">
                                    <p><strong>Nome:</strong> {patient.nome}</p>
                                    <p><strong>CPF:</strong> {patient.cpf}</p>
                                    <p><strong>Data de Nasc.:</strong> {new Date(patient.data_nasc).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                    <p><strong>Contato:</strong> {patient.whatsapp}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Stethoscope /> Dados do Médico</h3>
                                <div className="pl-6 border-l-2 border-primary/20 space-y-1 text-sm">
                                    <p><strong>Nome:</strong> {doctor.nome}</p>
                                    <p><strong>Especialidade:</strong> {doctor.especialidade}</p>
                                    <p><strong>CRM:</strong> {doctor.crm}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Calendar /> Detalhes da Consulta</h3>
                                <div className="pl-6 border-l-2 border-primary/20 space-y-1 text-sm">
                                    <p><strong>Serviço:</strong> {service.nome}</p>
                                    <p><strong>Data:</strong> {new Date(service.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                    <p><strong>Hora:</strong> {service.hora.slice(0, 5)}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><DollarSign /> Informações de Pagamento</h3>
                                <div className="pl-6 border-l-2 border-primary/20 space-y-1 text-sm">
                                    <p><strong>Valor:</strong> R$ {(service.preco_centavos / 100).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Status:</strong> <span className="font-bold text-amber-600">Aguardando Pagamento</span></p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-primary/5 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-xs text-muted-foreground">Este documento é uma confirmação do seu agendamento. O pagamento é necessário para garantir sua consulta.</p>
                            <p className="text-xs text-muted-foreground">Apresente o QR Code ou o protocolo no dia da consulta, se solicitado.</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <QRCode value={guide.qr_text || `protocolo:${protocolo}`} size={80} level="H" />
                           <Button onClick={handleDownload} size="sm">
                                <Download className="mr-2 h-4 w-4" /> Baixar PDF
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default GuideViewerPage;