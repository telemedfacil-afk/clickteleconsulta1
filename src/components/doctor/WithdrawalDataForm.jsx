import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WithdrawalDataForm = ({ onSave }) => {
    const { user } = useAuth();
    const { register, handleSubmit, control, watch, reset, formState: { isDirty } } = useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const paymentMethod = watch('withdrawal_payment_method');

    useEffect(() => {
        if (user) {
            fetchDoctorData();
        }
    }, [user]);

    const fetchDoctorData = async () => {
        try {
            const { data, error } = await supabase
                .from('medicos')
                .select('withdrawal_payment_method, withdrawal_pix_key, withdrawal_bank_name, withdrawal_bank_agency, withdrawal_bank_account')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            reset({
                withdrawal_payment_method: data.withdrawal_payment_method || 'pix',
                withdrawal_pix_key: data.withdrawal_pix_key || '',
                withdrawal_bank_name: data.withdrawal_bank_name || '',
                withdrawal_bank_agency: data.withdrawal_bank_agency || '',
                withdrawal_bank_account: data.withdrawal_bank_account || ''
            });
        } catch (error) {
            console.error("Error fetching withdrawal data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('medicos')
                .update({
                    withdrawal_payment_method: data.withdrawal_payment_method,
                    withdrawal_pix_key: data.withdrawal_pix_key,
                    withdrawal_bank_name: data.withdrawal_bank_name,
                    withdrawal_bank_agency: data.withdrawal_bank_agency,
                    withdrawal_bank_account: data.withdrawal_bank_account,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) throw error;

            toast({ title: "Sucesso", description: "Dados para saque atualizados com sucesso.", variant: "default" });
            
            // Re-fetch strictly to reset form state correctly (isDirty)
            await fetchDoctorData();
            
            // Notify parent to refresh its data if needed
            if (onSave) onSave();

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar dados de saque." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="dashboard-card border-t-2 border-t-green-500 rounded-lg">
                <CardContent className="p-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="dashboard-card border-t-2 border-t-green-500 rounded-lg">
                <CardHeader className="px-4 py-3 border-b border-gray-100">
                    <CardTitle className="dashboard-title flex items-center gap-2 text-sm">
                        <Wallet className="w-4 h-4 text-green-600" />
                        Dados para Saque
                    </CardTitle>
                    <CardDescription className="dashboard-subtitle text-xs">
                        Configure sua conta para receber o valor das consultas realizadas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-4 space-y-4">
                    <div className="grid gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="withdrawal_payment_method" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Método de Recebimento</Label>
                            <Controller
                                name="withdrawal_payment_method"
                                control={control}
                                defaultValue="pix"
                                render={({ field }) => (
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                    >
                                        <SelectTrigger className="bg-gray-50/50 border-gray-200 focus:bg-white transition-colors h-8 text-xs">
                                            <SelectValue placeholder="Selecione o método" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pix">PIX</SelectItem>
                                            <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {paymentMethod === 'pix' && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                <Label htmlFor="withdrawal_pix_key" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Chave PIX</Label>
                                <Input 
                                    id="withdrawal_pix_key" 
                                    placeholder="CPF, E-mail ou Telefone" 
                                    {...register('withdrawal_pix_key')} 
                                    className="bg-gray-50/50 border-gray-200 focus:bg-white transition-colors h-8 text-xs" 
                                />
                                <p className="text-[9px] text-muted-foreground">Chave onde você receberá seus pagamentos.</p>
                            </div>
                        )}

                        {paymentMethod === 'transferencia' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="space-y-1">
                                    <Label htmlFor="withdrawal_bank_name" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Nome do Banco</Label>
                                    <Input 
                                        id="withdrawal_bank_name" 
                                        placeholder="Ex: Nubank, Banco do Brasil" 
                                        {...register('withdrawal_bank_name')} 
                                        className="bg-white border-gray-200 focus:bg-white transition-colors h-8 text-xs" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="withdrawal_bank_agency" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Agência</Label>
                                    <Input 
                                        id="withdrawal_bank_agency" 
                                        placeholder="0000" 
                                        {...register('withdrawal_bank_agency')} 
                                        className="bg-white border-gray-200 focus:bg-white transition-colors h-8 text-xs" 
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor="withdrawal_bank_account" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Conta Corrente</Label>
                                    <Input 
                                        id="withdrawal_bank_account" 
                                        placeholder="00000-0" 
                                        {...register('withdrawal_bank_account')} 
                                        className="bg-white border-gray-200 focus:bg-white transition-colors h-8 text-xs" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50/50 flex justify-end border-t border-gray-100">
                    <Button 
                        type="submit" 
                        disabled={saving || !isDirty}
                        className="h-8 text-xs bg-primary hover:bg-primary/90 shadow-sm"
                    >
                        {saving ? (
                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Salvando...</>
                        ) : (
                            <><Save className="w-3 h-3 mr-2" /> Salvar Dados de Saque</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default WithdrawalDataForm;