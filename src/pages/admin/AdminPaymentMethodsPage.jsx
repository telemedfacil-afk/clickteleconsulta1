import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
    DollarSign, 
    Save, 
    Smartphone, 
    FileImage as ImageIcon, 
    Trash2, 
    QrCode, 
    BadgeDollarSign, 
    Loader2
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminPaymentMethodsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingQr, setUploadingQr] = useState(false);
    
    // Default settings structure
    const [settings, setSettings] = useState({
        pix_key: '',
        bank_details: '',
        payment_instructions: '',
        whatsapp_number: '',
        whatsapp_message: 'Olá, gostaria de enviar o comprovante de pagamento da consulta.',
        accept_pix: true,
        accept_card: false,
        accept_transfer: false,
        clinic_logo_url: '',
        pix_qr_code_url: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;
            try {
                // Fetch from configuracoes_site instead of medicos
                const { data, error } = await supabase
                    .from('configuracoes_site')
                    .select('settings')
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                if (data?.settings?.payment_settings) {
                    setSettings(prev => ({
                        ...prev,
                        ...data.settings.payment_settings
                    }));
                }
            } catch (error) {
                console.error("Error fetching payment settings:", error);
                // toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar configurações de pagamento." });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [user, toast]);

    const handleInputChange = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

    const handleFileUpload = async (event, type) => {
        const isLogo = type === 'logo';
        const setUploading = isLogo ? setUploadingLogo : setUploadingQr;
        try {
            setUploading(true);
            const file = event.target.files[0];
            if (!file) return;
            // Use a specific bucket path for admin assets
            const fileName = `admin-payment-${type}-${Math.random()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
            setSettings(prev => ({ ...prev, [isLogo ? 'clinic_logo_url' : 'pix_qr_code_url']: publicUrl }));
            toast({ title: "Upload concluído!", variant: "success" });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro no upload", description: "Tente novamente." });
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = (type) => setSettings(prev => ({ ...prev, [type === 'logo' ? 'clinic_logo_url' : 'pix_qr_code_url']: '' }));

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Get current settings to merge
            const { data: currentData } = await supabase
                .from('configuracoes_site')
                .select('*')
                .limit(1)
                .maybeSingle();
            
            let currentSettings = currentData?.settings || {};

            // 2. Update payment settings key
            const newSettings = {
                ...currentSettings,
                payment_settings: settings
            };

            let error;
            if (currentData?.id) {
                const { error: updateError } = await supabase
                    .from('configuracoes_site')
                    .update({ settings: newSettings })
                    .eq('id', currentData.id);
                error = updateError;
            } else {
                 const { error: insertError } = await supabase
                    .from('configuracoes_site')
                    .insert({ id: 1, settings: newSettings });
                error = insertError;
            }

            if (error) throw error;
            toast({ title: "Salvo!", description: "Configurações de pagamento da plataforma atualizadas.", variant: "default" });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Métodos de Recebimento</h1>
                    <p className="text-sm text-muted-foreground">Configure como você recebe os pagamentos.</p>
                </div>
            </div>
            
            <Card className="dashboard-card border-t-4 border-t-primary">
                <CardHeader className="px-0 pt-0 pb-6">
                    <CardTitle className="dashboard-title flex items-center gap-2">
                        <BadgeDollarSign className="w-5 h-5 text-primary" />
                        Configuração de Pagamentos
                    </CardTitle>
                    <CardDescription className="dashboard-subtitle">
                        Estas informações serão exibidas para seus pacientes no momento do pagamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-8">
                    
                    <div className="p-6 bg-blue-50/30 rounded-xl border border-blue-100/50">
                         <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2 mb-4">
                            <ImageIcon className="w-4 h-4 text-primary" /> Logo da Clínica / Consultório
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-6 items-center">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {settings.clinic_logo_url ? (
                                        <img src={settings.clinic_logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                {settings.clinic_logo_url && <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleRemoveImage('logo')}><Trash2 className="w-3 h-3" /></Button>}
                            </div>
                            <div className="space-y-2 flex-1 w-full">
                                <Label htmlFor="logo-upload" className="text-xs text-gray-500 uppercase">Enviar Imagem</Label>
                                <Input id="logo-upload" type="file" accept="image/*" className="bg-white border-gray-200 h-10 text-sm font-light" onChange={(e) => handleFileUpload(e, 'logo')} disabled={uploadingLogo} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2 border-b pb-2 border-gray-100">
                                <DollarSign className="w-4 h-4 text-primary" /> Opções de Pagamento
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <Label htmlFor="accept_pix" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="font-medium text-gray-700">Aceitar Pix</span>
                                        <span className="font-light text-xs text-gray-500">Exibir chave Pix manual</span>
                                    </Label>
                                    <Switch id="accept_pix" checked={settings.accept_pix} onCheckedChange={(checked) => handleInputChange('accept_pix', checked)} />
                                </div>

                                {settings.accept_pix && (
                                    <div className="space-y-4 pl-4 border-l-2 border-primary/10 ml-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-gray-500 uppercase">Chave Pix</Label>
                                            <Input placeholder="CPF, Email, etc." value={settings.pix_key} onChange={(e) => handleInputChange('pix_key', e.target.value)} className="bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-gray-500 uppercase flex items-center gap-2"><QrCode className="w-3 h-3"/> QR Code (Opcional)</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                                    {settings.pix_qr_code_url ? <img src={settings.pix_qr_code_url} alt="QR Code" className="w-full h-full object-cover" /> : <QrCode className="w-6 h-6 text-gray-300"/>}
                                                </div>
                                                <Input type="file" accept="image/*" className="bg-white h-10 text-xs" onChange={(e) => handleFileUpload(e, 'qr')} disabled={uploadingQr} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <Label htmlFor="accept_transfer" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="font-medium text-gray-700">Transferência (TED)</span>
                                        <span className="font-light text-xs text-gray-500">Exibir dados bancários</span>
                                    </Label>
                                    <Switch id="accept_transfer" checked={settings.accept_transfer} onCheckedChange={(checked) => handleInputChange('accept_transfer', checked)} />
                                </div>

                                {settings.accept_transfer && (
                                    <div className="space-y-2 pl-4 border-l-2 border-primary/10 ml-2 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs text-gray-500 uppercase">Dados da Conta</Label>
                                        <Textarea placeholder="Banco, Agência, Conta..." value={settings.bank_details} onChange={(e) => handleInputChange('bank_details', e.target.value)} rows={3} className="bg-white resize-none" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2 border-b pb-2 border-gray-100">
                                <Smartphone className="w-4 h-4 text-primary" /> Confirmação
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500 uppercase">WhatsApp para Comprovantes</Label>
                                    <Input placeholder="5511999999999" value={settings.whatsapp_number} onChange={(e) => handleInputChange('whatsapp_number', e.target.value.replace(/\D/g, ''))} className="bg-white" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500 uppercase">Mensagem Automática</Label>
                                    <Textarea value={settings.whatsapp_message} onChange={(e) => handleInputChange('whatsapp_message', e.target.value)} rows={2} className="bg-white resize-none" />
                                </div>

                                <div className="space-y-2 pt-4">
                                    <Label className="text-xs text-gray-500 uppercase">Instruções de Pagamento</Label>
                                    <Textarea placeholder="Ex: Enviar comprovante até 1h antes..." value={settings.payment_instructions} onChange={(e) => handleInputChange('payment_instructions', e.target.value)} rows={4} className="bg-white resize-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="px-0 flex justify-end pt-6 border-t border-gray-100">
                    <Button onClick={handleSave} disabled={saving} className="min-w-[140px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Tudo</>}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default AdminPaymentMethodsPage;