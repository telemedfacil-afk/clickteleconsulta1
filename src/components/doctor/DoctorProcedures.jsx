import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit2, Trash2, Stethoscope, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const ProceduresSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
    </div>
);

const DoctorProcedures = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [medicoId, setMedicoId] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProcedure, setEditingProcedure] = useState(null);
    
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
            // First get medico_id
            const { data: docData, error: docError } = await supabase
                .from('medicos')
                .select('id')
                .eq('user_id', user.id)
                .single();
                
            if (docError) throw docError;
            setMedicoId(docData.id);

            // Fetch procedures
            const { data: procData, error: procError } = await supabase
                .from('procedimentos')
                .select('*')
                .eq('medico_id', docData.id)
                .order('principal', { ascending: false })
                .order('created_at', { ascending: true });

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

    const openModal = (procedure = null) => {
        if (procedure) {
            setEditingProcedure(procedure);
            setFormData({
                nome: procedure.nome,
                descricao: procedure.descricao || '',
                preco: procedure.preco.toString(),
                principal: procedure.principal
            });
        } else {
            setEditingProcedure(null);
            setFormData({
                nome: '',
                descricao: '',
                preco: '',
                principal: procedures.length === 0 // default to principal if it's the first one
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nome.trim() || !formData.preco) {
            toast({ variant: "destructive", title: "Atenção", description: "Nome e preço são obrigatórios." });
            return;
        }

        setIsSaving(true);
        try {
            const priceVal = parseFloat(formData.preco.replace(',', '.'));
            
            // If setting as principal, update others to false first
            if (formData.principal) {
                await supabase
                    .from('procedimentos')
                    .update({ principal: false })
                    .eq('medico_id', medicoId);
            }

            const procPayload = {
                medico_id: medicoId,
                nome: formData.nome,
                descricao: formData.descricao,
                preco: priceVal,
                principal: formData.principal,
                updated_at: new Date().toISOString()
            };

            if (editingProcedure) {
                const { error } = await supabase
                    .from('procedimentos')
                    .update(procPayload)
                    .eq('id', editingProcedure.id);
                if (error) throw error;
                toast({ title: "Sucesso", description: "Procedimento atualizado." });
            } else {
                const { error } = await supabase
                    .from('procedimentos')
                    .insert([procPayload]);
                if (error) throw error;
                toast({ title: "Sucesso", description: "Procedimento adicionado." });
            }

            setIsModalOpen(false);
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

    if (loading) return <ProceduresSkeleton />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Meus Procedimentos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os serviços e valores oferecidos aos seus pacientes.</p>
                </div>
                <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Procedimento
                </Button>
            </div>

            {procedures.length === 0 ? (
                <Card className="border-dashed border-2 bg-gray-50">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Stethoscope className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum procedimento cadastrado</h3>
                        <p className="text-gray-500 mt-1 mb-4">Adicione os serviços que você oferece para que os pacientes possam agendar.</p>
                        <Button onClick={() => openModal()} variant="outline">Adicionar Agora</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {procedures.map(proc => (
                        <Card key={proc.id} className={`overflow-hidden transition-all ${proc.principal ? 'border-blue-200 ring-1 ring-blue-100 shadow-md' : 'border-gray-200 shadow-sm'}`}>
                            {proc.principal && (
                                <div className="bg-blue-50/80 px-4 py-2 border-b border-blue-100 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Procedimento Principal</span>
                                </div>
                            )}
                            <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1 flex-1">
                                    <h3 className="font-semibold text-lg text-gray-900">{proc.nome}</h3>
                                    {proc.descricao && <p className="text-sm text-gray-600 line-clamp-2">{proc.descricao}</p>}
                                    <div className="text-lg font-bold text-green-700 mt-2">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.preco)}
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button variant="outline" size="sm" onClick={() => openModal(proc)} className="flex-1 md:flex-none">
                                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(proc.id)} className="flex-1 md:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingProcedure ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome" className="text-gray-900 font-medium">Nome do Procedimento <span className="text-red-500">*</span></Label>
                            <Input 
                                id="nome" 
                                value={formData.nome}
                                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                placeholder="Ex: Consulta Psiquiátrica Online"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="descricao" className="text-gray-900 font-medium">Descrição</Label>
                            <Textarea 
                                id="descricao" 
                                value={formData.descricao}
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                placeholder="Descreva os detalhes deste procedimento..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="preco" className="text-gray-900 font-medium">Valor (R$) <span className="text-red-500">*</span></Label>
                            <Input 
                                id="preco" 
                                type="number"
                                step="0.01"
                                value={formData.preco}
                                onChange={(e) => setFormData({...formData, preco: e.target.value})}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox 
                                id="principal" 
                                checked={formData.principal}
                                onCheckedChange={(checked) => setFormData({...formData, principal: checked})}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="principal"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900"
                                >
                                    Definir como procedimento principal
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Este será o procedimento destaque exibido em seu perfil público.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorProcedures;