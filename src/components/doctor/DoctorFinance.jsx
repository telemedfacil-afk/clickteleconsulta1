import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, ArrowRight, Loader2, History, Download } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import WithdrawalDataForm from './WithdrawalDataForm';

const DoctorFinance = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [stats, setStats] = useState({
        totalEarned: 0,
        pending: 0,
        cancelled: 0,
        available: 0
    });
    
    // Withdrawal Request State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [requestingWithdraw, setRequestingWithdraw] = useState(false);
    const [doctorData, setDoctorData] = useState(null);

    useEffect(() => {
        if (user) {
            fetchFinancialData();
        }
    }, [user]);

    const fetchFinancialData = async () => {
        if (!doctorData) setLoading(true); 
        try {
            const { data: doc, error: docError } = await supabase
                .from('medicos')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (docError) throw docError;
            setDoctorData(doc);
            
            const { data: appts, error: apptsError } = await supabase
                .from('agendamentos')
                .select('*, patient:perfis_usuarios!agendamentos_patient_id_fkey(full_name)')
                .eq('medico_id', doc.id)
                .order('appointment_date', { ascending: false });

            if (apptsError) throw apptsError;

            const { data: withdraws, error: withdrawsError } = await supabase
                .from('saques')
                .select('*')
                .eq('doctor_id', doc.id)
                .order('created_at', { ascending: false });

            if (withdrawsError) throw withdrawsError;
            setWithdrawals(withdraws || []);

            let totalEarned = 0; 
            let pending = 0;
            let cancelled = 0;
            let available = 0;

            const totalWithdrawn = (withdraws || [])
                .filter(w => w.status !== 'Cancelado')
                .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

            const processedTransactions = appts.map(appt => {
                const totalValue = (appt.price_in_cents || 0) / 100;
                const feePercent = doc.payment_settings?.platform_fee_percent || 0; 
                const platformFee = totalValue * (feePercent / 100);
                const netValue = totalValue - platformFee;

                if (appt.status === 'cancelado') {
                    cancelled += totalValue; 
                } else if (appt.pagamento_status === 'pago') {
                    totalEarned += netValue;
                } else if (appt.status === 'confirmado') {
                    pending += netValue;
                }

                return {
                    ...appt,
                    netValue,
                    platformFee,
                    totalValue
                };
            });

            available = totalEarned - totalWithdrawn;
            if (available < 0) available = 0;

            setStats({ totalEarned, pending, cancelled, available });
            setTransactions(processedTransactions);

        } catch (error) {
            console.error("Financial fetch error:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados financeiros." });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestWithdraw = async () => {
        if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
            toast({ variant: "destructive", title: "Valor inválido", description: "Insira um valor maior que zero." });
            return;
        }

        if (parseFloat(withdrawAmount) > stats.available) {
             toast({ variant: "destructive", title: "Saldo insuficiente", description: "O valor solicitado excede seu saldo disponível." });
             return;
        }

        if (!doctorData.withdrawal_payment_method) {
             toast({ 
                variant: "destructive", 
                title: "Dados incompletos", 
                description: "Configure seus dados bancários abaixo antes de solicitar o saque." 
             });
             return;
        }

        if (doctorData.withdrawal_payment_method === 'pix' && !doctorData.withdrawal_pix_key) {
             toast({ variant: "destructive", title: "Chave PIX ausente", description: "Adicione sua chave PIX nos dados para saque." });
             return;
        }

        if (doctorData.withdrawal_payment_method === 'transferencia' && (!doctorData.withdrawal_bank_account || !doctorData.withdrawal_bank_agency)) {
             toast({ variant: "destructive", title: "Dados bancários incompletos", description: "Verifique seus dados bancários para saque." });
             return;
        }

        setRequestingWithdraw(true);
        try {
            const withdrawalData = {
                doctor_id: doctorData.id,
                valor: parseFloat(withdrawAmount),
                metodo_pagamento: doctorData.withdrawal_payment_method,
                dados_saque_json: {
                    pix_key: doctorData.withdrawal_pix_key,
                    bank_name: doctorData.withdrawal_bank_name,
                    bank_agency: doctorData.withdrawal_bank_agency,
                    bank_account: doctorData.withdrawal_bank_account
                },
                status: 'Aguardando Recebimento'
            };

            const { error } = await supabase
                .from('saques')
                .insert([withdrawalData]);

            if (error) throw error;

            toast({ 
                title: "Solicitação enviada!", 
                description: `Saque de R$ ${parseFloat(withdrawAmount).toFixed(2)} solicitado com sucesso.`, 
                variant: "success" 
            });
            
            setIsWithdrawOpen(false);
            setWithdrawAmount('');
            fetchFinancialData();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao solicitar", description: error.message });
        } finally {
            setRequestingWithdraw(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
          confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          pendente: 'bg-amber-50 text-amber-700 border-amber-100',
          cancelado: 'bg-red-50 text-red-700 border-red-100',
          atendido: 'bg-blue-50 text-blue-700 border-blue-100'
        };
        return <Badge className={`${styles[status] || 'bg-gray-50 text-gray-700 border-gray-100'} h-5 text-[10px] px-2 rounded-sm font-medium border`} variant="outline">{status?.toUpperCase()}</Badge>;
    };

    const getWithdrawalStatusBadge = (status) => {
        const styles = {
            'Aguardando Recebimento': 'bg-amber-50 text-amber-800 border-amber-200',
            'Recebido': 'bg-emerald-50 text-emerald-800 border-emerald-200',
            'Cancelado': 'bg-red-50 text-red-800 border-red-200'
        };
        return <Badge className={`${styles[status] || 'bg-gray-50 text-gray-700'} h-5 text-[10px] px-2 rounded-sm font-medium border`} variant="outline">{status}</Badge>;
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400 w-8 h-8" /></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Financeiro</h1>
                    <p className="text-sm text-gray-500">Gerencie seus recebimentos e fluxo de caixa.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 h-9 text-xs px-3 rounded-sm border-gray-300 text-gray-700">
                        <Download className="w-3.5 h-3.5" /> Relatório
                    </Button>
                    <Button onClick={() => setIsWithdrawOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9 text-xs px-3 rounded-sm">
                        <Wallet className="w-3.5 h-3.5" /> Solicitar Saque
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-l-4 border-l-green-500 border-gray-200 shadow-sm p-4 rounded-sm">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saldo Disponível (Líquido)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-[11px] text-green-600 flex items-center mt-1 font-medium">
                            <TrendingUp className="w-3 h-3 mr-1" /> Disponível para saque
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-blue-500 border-gray-200 shadow-sm p-4 rounded-sm">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wide">A Receber (Pendente)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-[11px] text-blue-600 flex items-center mt-1 font-medium">
                            <ArrowRight className="w-3 h-3 mr-1" /> Agendamentos confirmados
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-red-500 border-gray-200 shadow-sm p-4 rounded-sm">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wide">Valores Cancelados</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.cancelled.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-[11px] text-red-600 flex items-center mt-1 font-medium">
                            <TrendingDown className="w-3 h-3 mr-1" /> Receita bruta perdida
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="consultas" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[300px] h-9 p-1 bg-gray-100 rounded-sm">
                    <TabsTrigger value="consultas" className="text-xs font-medium py-1.5 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">Extrato de Consultas</TabsTrigger>
                    <TabsTrigger value="saques" className="text-xs font-medium py-1.5 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">Extrato de Saques</TabsTrigger>
                </TabsList>
                
                <TabsContent value="consultas" className="mt-4">
                    <Card className="border border-gray-200 shadow-sm rounded-sm">
                        <CardHeader className="p-4 border-b border-gray-100">
                            <CardTitle className="text-sm font-semibold text-gray-900">Extrato de Consultas</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Histórico detalhado de atendimentos.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50 border-b border-gray-200">
                                    <TableRow className="h-9 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Data</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Paciente</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Status</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Pagamento</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Valor Bruto</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Taxa Plat.</TableHead>
                                        <TableHead className="text-right font-bold text-green-700 text-[10px] uppercase tracking-wide py-2 px-4">Líquido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length > 0 ? (
                                        transactions.map((t) => (
                                            <TableRow key={t.id} className="h-10 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                <TableCell className="py-2 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 text-xs">
                                                            {format(parseISO(t.appointment_date), 'dd/MM/yyyy')}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">{t.appointment_time?.slice(0, 5)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-4 text-xs font-medium text-gray-700">{t.patient?.full_name}</TableCell>
                                                <TableCell className="py-2 px-4">{getStatusBadge(t.status)}</TableCell>
                                                <TableCell className="py-2 px-4">
                                                    <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-sm font-medium border ${t.pagamento_status === 'pago' ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500'}`}>
                                                        {t.pagamento_status?.toUpperCase() || 'PENDENTE'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-gray-600 text-xs py-2 px-4 font-medium">
                                                    {t.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                                <TableCell className="text-right text-red-500 text-[10px] py-2 px-4">
                                                    - {t.platformFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-700 text-xs py-2 px-4">
                                                    {t.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                                                Nenhuma transação encontrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="saques" className="mt-4">
                     <Card className="border border-gray-200 shadow-sm rounded-sm">
                        <CardHeader className="p-4 border-b border-gray-100">
                            <CardTitle className="text-sm font-semibold text-gray-900">Extrato de Saques</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Histórico de retiradas.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                             <Table>
                                <TableHeader className="bg-gray-50 border-b border-gray-200">
                                    <TableRow className="h-9 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Data Solicitação</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Valor</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Destino</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Processado em</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.length > 0 ? (
                                        withdrawals.map((w) => {
                                            const details = w.dados_saque_json;
                                            return (
                                                <TableRow key={w.id} className="h-10 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <TableCell className="font-medium text-gray-700 text-xs py-2 px-4">
                                                        {format(parseISO(w.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-gray-900 text-xs py-2 px-4">
                                                        {parseFloat(w.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600 py-2 px-4">
                                                        {w.metodo_pagamento === 'pix' ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] uppercase font-bold text-gray-400">PIX</span>
                                                                <span className="text-[10px] font-medium">{details.pix_key}</span>
                                                            </div>
                                                        ) : (
                                                             <div className="flex flex-col">
                                                                <span className="text-[9px] uppercase font-bold text-gray-400">Transf.</span>
                                                                <span className="text-[10px] font-medium">{details.bank_name}</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-4">
                                                        {getWithdrawalStatusBadge(w.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-gray-500 py-2 px-4 font-medium">
                                                        {w.data_processamento ? format(parseISO(w.data_processamento), "dd/MM/yyyy") : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2 text-xs">
                                                <History className="w-6 h-6 opacity-20" />
                                                Nenhum saque solicitado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                             </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>

            <div className="pt-4">
                <WithdrawalDataForm onSave={fetchFinancialData} />
            </div>

            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className="p-6 sm:max-w-[400px] rounded-sm border-gray-200">
                    <DialogHeader className="p-0 pb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900">Solicitar Saque</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            O valor será transferido para sua conta cadastrada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                         <div className="bg-gray-50 p-4 rounded-sm border border-gray-200 text-center">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Disponível para saque</p>
                            <p className="text-xl font-bold text-green-600 mt-1">
                                {stats.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                         </div>
                         
                         <div className="text-xs bg-blue-50 text-blue-900 p-3 rounded-sm border border-blue-100">
                             <strong className="block mb-1">Destino Atual: </strong>
                             {doctorData?.withdrawal_payment_method === 'pix' ? (
                                 <span className="font-mono">PIX ({doctorData.withdrawal_pix_key})</span>
                             ) : doctorData?.withdrawal_payment_method === 'transferencia' ? (
                                 <span className="font-medium">Banco {doctorData.withdrawal_bank_name}</span>
                             ) : (
                                 <span className="text-red-600 font-semibold">Não configurado! Configure abaixo.</span>
                             )}
                         </div>

                         <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Valor do Saque (R$)</Label>
                            <Input 
                                type="number" 
                                placeholder="0,00" 
                                value={withdrawAmount} 
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="h-9 text-sm rounded-sm border-gray-300"
                            />
                         </div>
                    </div>
                    <DialogFooter className="p-0 pt-4">
                        <Button variant="outline" onClick={() => setIsWithdrawOpen(false)} className="h-9 text-xs rounded-sm border-gray-300">Cancelar</Button>
                        <Button onClick={handleRequestWithdraw} disabled={requestingWithdraw || parseFloat(withdrawAmount) > stats.available || !doctorData?.withdrawal_payment_method} className="h-9 text-xs rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                            {requestingWithdraw && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorFinance;