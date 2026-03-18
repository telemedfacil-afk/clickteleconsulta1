
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit2, Trash2, Stethoscope, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const DoctorProceduresPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [medicoId, setMedicoId] = useState(null);
    const [taxPercentage, setTaxPercentage] = useState(0);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco: '',
        principal: false
    });

    const fetchProcedures = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data: docData, error: docError } = await supabase
                .from('medicos')
                .select('id, payment_settings')
                .eq('user_id', user.id)
                .single();
                
            if (docError) throw docError;
            setMedicoId(docData.id);
            setTaxPercentage(docData.payment_settings?.platform_fee_percent || 0);

            const { data: procData, error: procError } = await supabase
                .from('procedimentos')
                .select('*')
                .eq('medico_id', docData.id)
                .order('principal', { ascending: false })
                .order('created_at', { ascending: false });

            if (procError) throw procError;
            setProcedures(procData || []);
        } catch (error) {
            console.error('Error fetching procedures:', error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os procedimentos." });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchProcedures();
    }, [fetchProcedures]);

    const handleOpenForm = (proc = null) => {
        if (proc) {
            setEditingId(proc.id);
            setFormData({
                nome: proc.nome,
                descricao: proc.descricao || '',
                preco: proc.preco.toString(),
                principal: proc.principal || false
            });
        } else {
            setEditingId(null);
            setFormData({
                nome: '',
                descricao: '',
                preco: '',
                principal: procedures.length === 0
            });
        }
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!formData.nome.trim() || !formData.preco) {
            toast({ variant: "destructive", title: "Atenção", description: "Nome e preço são obrigatórios." });
            return;
        }

        setIsSaving(true);
        try {
            const priceVal = parseFloat(formData.preco.toString().replace(',', '.'));
            
            if (formData.principal) {
                await supabase
                    .from('procedimentos')
                    .update({ principal: false })
                    .eq('medico_id', medicoId);
            }

            const payload = {
                medico_id: medicoId,
                nome: formData.nome,
                descricao: formData.descricao,
                preco: priceVal,
                principal: formData.principal,
                updated_at: new Date().toISOString()
            };

            if (editingId) {
                const { error } = await supabase.from('procedimentos').update(payload).eq('id', editingId);
                if (error) throw error;
                toast({ title: "Sucesso", description: "Procedimento atualizado." });
            } else {
                const { error } = await supabase.from('procedimentos').insert([payload]);
                if (error) throw error;
                toast({ title: "Sucesso", description: "Procedimento adicionado." });
            }

            setIsFormOpen(false);
            fetchProcedures();
        } catch (error) {
            console.error('Error saving procedure:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar procedimento." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir este procedimento?")) return;
        
        try {
            const { error } = await supabase.from('procedimentos').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Sucesso", description: "Procedimento removido." });
            fetchProcedures();
        } catch (error) {
            console.error('Error deleting procedure:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao remover procedimento." });
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const calculateFinalPrice = (price, taxPercent) => {
        const tax = Number(taxPercent) || 0;
        if (tax > 0) {
            return price / (1 - (tax / 100));
        }
        return price;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 w-full"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:w-auto flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 break-words">Meus Procedimentos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os serviços, descrições e valores do seu atendimento.</p>
                </div>
                {!isFormOpen && (
                    <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all h-9 text-sm shrink-0 w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Novo Procedimento
                    </Button>
                )}
            </div>

            {isFormOpen && (
                <Card className="border-blue-100 shadow-md rounded-xl overflow-hidden mb-6 w-full">
                    <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex items-center gap-3">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 truncate">
                            {editingId ? 'Editar Procedimento' : 'Adicionar Procedimento'}
                        </h2>
                    </div>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="nome" className="text-gray-900 font-semibold text-sm">Nome do Procedimento <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="nome" 
                                    value={formData.nome}
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    placeholder="Ex: Consulta Psiquiátrica Online"
                                    className="text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg h-9 text-sm w-full"
                                />
                            </div>
                            
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="descricao" className="text-gray-900 font-semibold text-sm">Descrição detalhada</Label>
                                <Textarea 
                                    id="descricao" 
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    placeholder="Descreva os detalhes, duração aproximada ou o que está incluso no procedimento..."
                                    className="min-h-[80px] text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-y text-sm w-full"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="preco" className="text-gray-900 font-semibold text-sm">Valor de Repasse (R$) <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="preco" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.preco}
                                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                                    placeholder="0.00"
                                    className="text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg h-9 text-sm w-full"
                                />
                                <p className="text-[11px] text-gray-500 font-medium">Este é o valor líquido que você receberá.</p>
                            </div>

                            <div className="flex items-center space-x-2 md:pt-6">
                                <Checkbox 
                                    id="principal" 
                                    checked={formData.principal}
                                    onCheckedChange={(checked) => setFormData({...formData, principal: checked})}
                                    className="w-4 h-4 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                                />
                                <Label htmlFor="principal" className="text-sm font-semibold text-gray-900 cursor-pointer select-none break-words">
                                    Marcar como procedimento principal
                                </Label>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-6 mt-6 border-t border-gray-100">
                            <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="rounded-lg font-semibold h-9 text-sm w-full sm:w-auto">Cancelar</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-sm h-9 text-sm w-full sm:w-auto">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : null}
                                Salvar Procedimento
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isFormOpen && procedures.length === 0 && (
                <Card className="border-dashed border-2 bg-gray-50/50 rounded-xl w-full">
                    <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Nenhum procedimento cadastrado</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-5 max-w-md">Adicione os serviços que você oferece para que os pacientes possam visualizá-los em seu perfil público.</p>
                        <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg font-semibold h-9 text-sm w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Procedimento
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!isFormOpen && procedures.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                    {procedures.map(proc => {
                        const repassePrice = proc.preco;
                        const finalPrice = calculateFinalPrice(proc.preco, taxPercentage);

                        return (
                            <Card key={proc.id} className={`overflow-hidden transition-all rounded-xl flex flex-col h-full w-full ${proc.principal ? 'border-blue-300 ring-1 ring-blue-100 shadow-md' : 'border-gray-200 shadow-sm hover:shadow-md'}`}>
                                <CardContent className="p-5 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2 break-words">{proc.nome}</h3>
                                        {proc.principal && (
                                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none gap-1 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                                <Star className="w-3 h-3 fill-blue-600" /> Principal
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {proc.descricao && (
                                        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3 flex-grow break-words">{proc.descricao}</p>
                                    )}
                                    
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-auto pt-4">
                                        <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 w-full">
                                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-0.5 truncate">Valor de Repasse</p>
                                            <p className="text-lg font-extrabold text-blue-700 truncate">
                                                {formatCurrency(repassePrice)}
                                            </p>
                                        </div>
                                        <div className="bg-green-50/60 border border-green-100 rounded-lg p-3 w-full">
                                            <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-0.5 truncate flex items-center justify-between">
                                                Preço Paciente
                                            </p>
                                            <p className="text-lg font-extrabold text-green-700 truncate">
                                                {formatCurrency(finalPrice)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(proc)} className="flex-1 text-xs font-semibold rounded-lg h-8">
                                            <Edit2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Editar
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDelete(proc.id)} className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-semibold rounded-lg h-8">
                                            <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Excluir
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DoctorProceduresPage;
