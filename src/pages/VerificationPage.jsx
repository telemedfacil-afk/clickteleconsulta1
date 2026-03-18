import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle2, XCircle, FileText, Download, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const VerificationPage = () => {
    const { code } = useParams();
    const [status, setStatus] = useState('loading'); // loading, valid, invalid
    const [docData, setDocData] = useState(null);

    useEffect(() => {
        const verifyDocument = async () => {
            if (!code) {
                setStatus('invalid');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('doc_instances')
                    .select('*, doctor:medicos(name, crm, specialty), patient:perfis_usuarios(full_name, cpf)')
                    .eq('verification_code', code)
                    .single();

                if (error || !data) {
                    setStatus('invalid');
                } else {
                    setDocData(data);
                    setStatus('valid');
                }
            } catch (err) {
                console.error(err);
                setStatus('invalid');
            }
        };

        verifyDocument();
    }, [code]);

    const maskCpf = (cpf) => {
        if (!cpf) return '***.***.***-**';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4');
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Helmet>
                    <title>Verificando Documento...</title>
                </Helmet>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Helmet>
                    <title>Documento Inválido</title>
                </Helmet>
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardHeader className="text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-red-700">Documento Inválido</CardTitle>
                        <CardDescription className="text-red-600">
                            Não foi possível encontrar um documento com o código fornecido. Verifique o link ou entre em contato com o emissor.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-sans">
            <Helmet>
                <title>Documento Autêntico - Verificação</title>
            </Helmet>
            <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-green-600">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">Documento Autêntico</CardTitle>
                    <CardDescription>
                        A validade deste documento foi confirmada em nossa base de dados.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-slate-500 font-medium">Tipo de Documento</p>
                            <p className="text-slate-900 capitalize font-semibold">{docData.doc_type}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-500 font-medium">Data de Emissão</p>
                            <p className="text-slate-900 font-semibold">
                                {format(new Date(docData.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-50 p-2 rounded-full">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Emitido por</p>
                                <p className="text-slate-900 font-bold">{docData.doctor?.name}</p>
                                <p className="text-xs text-slate-500">CRM: {docData.doctor?.crm} - {docData.doctor?.specialty}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-slate-100 p-2 rounded-full">
                                <User className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Paciente</p>
                                <p className="text-slate-900 font-bold">{docData.patient?.full_name}</p>
                                <p className="text-xs text-slate-500">CPF: {maskCpf(docData.patient?.cpf)}</p>
                            </div>
                        </div>
                    </div>
                    
                    {docData.status === 'signed' ? (
                        <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center">
                            <p className="text-green-700 font-bold text-sm">✓ Assinado Digitalmente (ICP-Brasil)</p>
                            <p className="text-green-600 text-xs mt-1">Garante a autenticidade e integridade legal.</p>
                        </div>
                    ) : (
                         <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-center">
                            <p className="text-amber-700 font-bold text-sm">⚠ Assinatura Digital Pendente</p>
                            <p className="text-amber-600 text-xs mt-1">Este documento foi gerado mas ainda não foi assinado digitalmente.</p>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-slate-50 p-6">
                    <Button className="w-full gap-2" size="lg" onClick={() => window.open(docData.pdf_path_signed || docData.pdf_path_original, '_blank')}>
                        <Download className="w-4 h-4" /> Baixar Documento Original
                    </Button>
                </CardFooter>
            </Card>
            
            <p className="text-xs text-slate-400 mt-8">
                Código de verificação: {code}
            </p>
        </div>
    );
};

export default VerificationPage;