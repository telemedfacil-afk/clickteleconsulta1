import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, FileText, Upload, Link as LinkIcon, ExternalLink, CheckCircle2, ShieldAlert } from 'lucide-react';
import useAsync from '@/hooks/useAsync';
import { Skeleton } from '@/components/ui/skeleton';

const DOC_TYPES = {
    terms_of_service: 'Termos de Serviço',
    privacy_policy: 'Política de Privacidade (LGPD)',
    refund_policy: 'Política de Reembolso',
    telemedicine_consent: 'Consentimento de Telemedicina'
};

const LegalSkeleton = () => (
    <Card className="dashboard-card">
        <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
            <Skeleton className="h-48 w-full" />
        </CardContent>
    </Card>
);

const DoctorLegal = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('terms_of_service');
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            terms_of_service: '',
            privacy_policy: '',
            refund_policy: '',
            telemedicine_consent: ''
        }
    });

    const currentUrl = watch(activeTab);

    const fetchLegalData = useCallback(async () => {
        if (!user) throw new Error("Usuário não autenticado.");
        const { data, error } = await supabase
            .from('medicos')
            .select('legal_docs')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        return data?.legal_docs || {};
    }, [user]);

    const { status, value: legalDocs, error: loadError } = useAsync(fetchLegalData, true);

    useEffect(() => {
        if (status === 'success' && legalDocs) {
            Object.keys(DOC_TYPES).forEach(key => {
                setValue(key, legalDocs[key] || '');
            });
        }
    }, [status, legalDocs, setValue]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Simple validation: Allow PDF, Docx, Txt
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Por favor envie PDF, Word ou TXT.' });
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${activeTab}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            setValue(activeTab, publicUrl, { shouldDirty: true });
            toast({ title: 'Upload concluído!', description: 'Arquivo enviado com sucesso. Não esqueça de salvar.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro no upload', description: 'Falha ao enviar arquivo. Tente novamente.' });
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (formData) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('medicos')
                .update({ legal_docs: formData })
                .eq('user_id', user.id);

            if (error) throw error;

            toast({ title: 'Sucesso!', description: 'Documentos legais atualizados.', variant: 'success' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (status === 'pending' || status === 'idle') return <LegalSkeleton />;
    if (status === 'error') return <div className="p-4 text-red-500">Erro: {loadError.message}</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <h1 className="text-xl font-normal tracking-tight text-gray-800">Documentos Legais</h1>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="dashboard-card">
                    <CardHeader className="px-0 pt-0 pb-6 border-b border-gray-100">
                        <CardTitle className="dashboard-title flex items-center gap-2">
                            <ShieldAlert className="text-primary w-5 h-5"/> Configuração Jurídica
                        </CardTitle>
                        <CardDescription className="dashboard-subtitle mt-1">
                            Configure os documentos que serão exibidos no seu perfil público para conformidade legal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 py-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-50 p-1 rounded-lg mb-8 h-auto">
                                {Object.entries(DOC_TYPES).map(([key, label]) => (
                                    <TabsTrigger 
                                        key={key} 
                                        value={key}
                                        className="text-xs py-2 h-auto whitespace-normal text-center data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        {label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            
                            {Object.entries(DOC_TYPES).map(([key, label]) => (
                                <TabsContent key={key} value={key} className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg mb-4">
                                        <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                                            <FileText className="w-4 h-4"/> {label}
                                        </h3>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Faça o upload do arquivo PDF ou insira um link direto para o documento hospedado externamente (Google Drive, Dropbox, site próprio).
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`${key}-url`} className="text-sm font-medium text-gray-700">URL do Documento</Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input 
                                                        id={`${key}-url`} 
                                                        placeholder="https://..." 
                                                        {...register(key)} 
                                                        className="pl-9 bg-white" 
                                                    />
                                                </div>
                                                {currentUrl && (
                                                    <Button type="button" variant="outline" size="icon" asChild>
                                                        <a href={currentUrl} target="_blank" rel="noopener noreferrer" title="Ver documento atual">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-gray-200" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-white px-2 text-gray-400 font-medium">Ou faça upload</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor={`file-${key}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    {uploading ? (
                                                        <Loader2 className="w-8 h-8 mb-3 text-gray-400 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                                    )}
                                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste o arquivo</p>
                                                    <p className="text-xs text-gray-400">PDF, DOCX ou TXT (MAX. 5MB)</p>
                                                </div>
                                                <input 
                                                    id={`file-${key}`} 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept=".pdf,.doc,.docx,.txt"
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                    <CardFooter className="px-0 pt-4 border-t border-gray-100 flex justify-end">
                        <Button type="submit" disabled={isSaving || uploading} className="bg-primary hover:bg-primary/90 min-w-[120px]">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default DoctorLegal;