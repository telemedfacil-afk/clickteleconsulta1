import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileText, Banknote, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminWithdrawalsPage = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { toast } = useToast();
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('saques')
                .select(`
                    *,
                    medicos ( name, public_name )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWithdrawals(data || []);
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os saques.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        setProcessing(true);
        try {
            const updates = {
                status: newStatus,
                data_processamento: newStatus !== 'Aguardando Recebimento' ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from('saques')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            
            toast({ 
                title: 'Status atualizado', 
                description: `Saque marcado como ${newStatus}.`, 
                variant: newStatus === 'Recebido' ? 'success' : 'default' 
            });
            fetchWithdrawals();
            if(selectedWithdrawal?.id === id) {
                 setIsDetailsOpen(false);
                 setSelectedWithdrawal(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const openDetails = (withdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setIsDetailsOpen(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Aguardando Recebimento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Recebido': 'bg-green-100 text-green-800 border-green-200',
            'Cancelado': 'bg-red-100 text-red-800 border-red-200'
        };
        return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'} variant="outline">{status}</Badge>;
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Solicitações de Saque</h2>
                    <p className="text-muted-foreground">Gerencie os pagamentos aos médicos parceiros.</p>
                </div>
                <Button variant="outline" onClick={fetchWithdrawals}>
                    <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Solicitações</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Médico</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {withdrawals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Nenhuma solicitação de saque encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                withdrawals.map((w) => (
                                    <TableRow key={w.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {format(parseISO(w.created_at), 'dd/MM/yyyy')}
                                                </span>
                                                <span className="text-xs text-gray-500">{format(parseISO(w.created_at), 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{w.medicos?.public_name || w.medicos?.name || 'Médico não encontrado'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {parseFloat(w.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">
                                            {w.metodo_pagamento === 'transferencia' ? 'Transferência' : 'PIX'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(w.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openDetails(w)}>
                                                    <FileText className="w-4 h-4 mr-1" /> Detalhes
                                                </Button>
                                                {w.status === 'Aguardando Recebimento' && (
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleUpdateStatus(w.id, 'Recebido')}
                                                        disabled={processing}
                                                    >
                                                        <Banknote className="w-4 h-4 mr-1" /> Pagar
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Saque</DialogTitle>
                        <DialogDescription>
                            Dados bancários para realizar o pagamento.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedWithdrawal && (
                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500 mb-1">Valor a Transferir</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {parseFloat(selectedWithdrawal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm border-b pb-1">Dados de Destino</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-gray-500">Beneficiário:</span>
                                    <span className="font-medium text-right">{selectedWithdrawal.medicos?.name}</span>
                                    
                                    <span className="text-gray-500">Método:</span>
                                    <span className="font-medium text-right uppercase">{selectedWithdrawal.metodo_pagamento}</span>
                                    
                                    {selectedWithdrawal.metodo_pagamento === 'pix' ? (
                                        <>
                                            <span className="text-gray-500">Chave PIX:</span>
                                            <span className="font-bold text-right text-blue-600">{selectedWithdrawal.dados_saque_json.pix_key}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-gray-500">Banco:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_name}</span>
                                            
                                            <span className="text-gray-500">Agência:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_agency}</span>
                                            
                                            <span className="text-gray-500">Conta:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_account}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                         {selectedWithdrawal?.status === 'Aguardando Recebimento' && (
                             <>
                                <Button 
                                    variant="destructive" 
                                    className="sm:mr-auto"
                                    onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'Cancelado')}
                                    disabled={processing}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Cancelar Solicitação
                                </Button>
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'Recebido')}
                                    disabled={processing}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Pago
                                </Button>
                             </>
                         )}
                         <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminWithdrawalsPage;