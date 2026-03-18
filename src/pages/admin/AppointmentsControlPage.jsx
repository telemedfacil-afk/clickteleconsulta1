import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Search, Filter, MoreHorizontal, Eye, Pencil, Trash2, Ban, Calendar as CalendarIcon, X, CheckCircle2, XCircle, Clock, FileText, DollarSign, User, Stethoscope, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE = 10;

const AppointmentsControlPage = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  
  // Date Range Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Actions
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    status: '',
    pagamento_status: '',
    appointment_date: '',
    appointment_time: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Appointments with disambiguated relationship
      const { data: aptData, error: aptError } = await supabase
        .from('agendamentos')
        .select(`
            *,
            medicos ( id, name, specialty, crm, uf, payment_settings ),
            patient:perfis_usuarios!patient_id ( id, full_name, email, cpf, whatsapp ),
            guias:agendamentos_guia_id_fkey ( medico_snapshot )
        `)
        .order('created_at', { ascending: false });

      if (aptError) throw aptError;
      setAppointments(aptData || []);

      // Fetch Doctors for filter
      const { data: docData, error: docError } = await supabase
        .from('medicos')
        .select('id, name')
        .order('name');
      
      if (docError) throw docError;
      setDoctors(docData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate financials for a single appointment
  const calculateFinancials = (apt) => {
    const totalValue = (apt.price_in_cents || 0) / 100;
    
    // Priority 1: Fee from snapshot (Historical accuracy)
    let feePercent = apt.guias?.medico_snapshot?.payment_settings?.platform_fee_percent;
    
    // Priority 2: Fee from current doctor settings
    if (feePercent === undefined || feePercent === null) {
        feePercent = apt.medicos?.payment_settings?.platform_fee_percent;
    }

    // Default: 0% if nothing configured
    if (feePercent === undefined || feePercent === null) {
        feePercent = 0;
    }

    const siteFee = totalValue * (feePercent / 100);
    const doctorPayout = totalValue - siteFee;

    return { totalValue, siteFee, doctorPayout, feePercent };
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const matchesSearch = 
        (apt.patient?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (apt.medicos?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (apt.protocolo?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      const matchesDoctor = doctorFilter === 'all' || apt.medicos?.id === doctorFilter;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const aptDate = parseISO(apt.appointment_date);
        const start = startDate ? startOfDay(parseISO(startDate)) : null;
        const end = endDate ? endOfDay(parseISO(endDate)) : null;

        if (start && end) {
            matchesDate = isWithinInterval(aptDate, { start, end });
        } else if (start) {
            matchesDate = aptDate >= start;
        } else if (end) {
            matchesDate = aptDate <= end;
        }
      }

      return matchesSearch && matchesStatus && matchesDoctor && matchesDate;
    });
  }, [appointments, searchTerm, statusFilter, doctorFilter, startDate, endDate]);

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    // Updated logic: Include 'atendido' status in the confirmed count
    const confirmed = filteredAppointments.filter(a => a.status === 'confirmado' || a.status === 'atendido').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'cancelado').length;
    
    // Financials based on Paid status, summing real calculated values
    const paidAppointments = filteredAppointments.filter(a => a.pagamento_status === 'pago');
    
    let totalRevenue = 0;
    let totalSiteFees = 0;
    let totalDoctorPayout = 0;

    paidAppointments.forEach(apt => {
        const { totalValue, siteFee, doctorPayout } = calculateFinancials(apt);
        totalRevenue += totalValue;
        totalSiteFees += siteFee;
        totalDoctorPayout += doctorPayout;
    });

    return { total, confirmed, cancelled, totalRevenue, totalSiteFees, totalDoctorPayout };
  }, [filteredAppointments]);

  const handleEditClick = (apt) => {
    setSelectedAppointment(apt);
    setEditForm({
      status: apt.status || 'pendente',
      pagamento_status: apt.pagamento_status || 'pendente',
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: editForm.status,
          pagamento_status: editForm.pagamento_status,
          appointment_date: editForm.appointment_date,
          appointment_time: editForm.appointment_time
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({ title: 'Agendamento atualizado com sucesso!' });
      fetchData(); 
      setIsEditOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'cancelado',
          medico_decisao: 'Cancelado pela administração' 
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;
      toast({ title: 'Agendamento cancelado.' });
      fetchData();
      setIsCancelOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    setProcessing(true);
    try {
      await supabase.from('agendamentos').update({ guia_id: null }).eq('id', selectedAppointment.id);
      
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', selectedAppointment.id);

      if (error) throw error;
      toast({ title: 'Agendamento excluído permanentemente.' });
      fetchData();
      setIsDeleteOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Verifique se existem registros dependentes.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleWipeAllData = async () => {
    setProcessing(true);
    try {
        console.log("Starting System Wipe via RPC...");
        
        // Use the server-side RPC function for atomic and complete deletion
        const { error } = await supabase.rpc('wipe_system_data');
        
        if (error) throw error;

        toast({ 
            title: 'Sistema Resetado com Sucesso', 
            description: 'A página será recarregada para atualizar todos os dados.',
            variant: 'default',
            className: 'bg-green-600 text-white border-none'
        });
        
        setIsWipeOpen(false);

        // Force reload to clear all caches in Admin, Patient and Doctor panels
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error("Wipe error full trace:", error);
        toast({ 
            title: 'Erro ao Resetar', 
            description: error.message || "Erro desconhecido ao executar limpeza.",
            variant: 'destructive'
        });
        setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmado: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
      pendente: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
      cancelado: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
      atendido: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'} variant="outline">{status?.toUpperCase()}</Badge>;
  };

  const getPaymentBadge = (status) => {
    const styles = {
      pago: 'bg-green-50 text-green-700 border-green-200',
      pendente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      falha: 'bg-red-50 text-red-700 border-red-200',
      reembolsado: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
        {status === 'pago' ? 'PAGO' : status?.toUpperCase() || 'PENDENTE'}
      </span>
    );
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Agendamentos</h2>
          <p className="text-muted-foreground">Gerencie todas as consultas da plataforma.</p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant="destructive" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsWipeOpen(true)}
            >
                <Trash2 className="w-4 h-4"/> Resetar Sistema
            </Button>
           <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
             <Filter className="w-4 h-4"/> Atualizar Lista
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados / Cancelados</CardTitle>
            <div className="flex gap-1">
                 <CheckCircle2 className="h-4 w-4 text-green-600" />
                 <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                <span className="text-green-600">{stats.confirmed}</span>
                <span className="text-gray-300 mx-2">/</span>
                <span className="text-red-600">{stats.cancelled}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Repasse Médicos (Total)</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {stats.totalDoctorPayout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-blue-500 mt-1">Baseado em taxas individuais</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Taxa do Site (Total)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {stats.totalSiteFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-green-500 mt-1">Receita da plataforma</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 flex-wrap">
          <div className="relative flex-grow md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          
          <Select value={doctorFilter} onValueChange={(v) => { setDoctorFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Médico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Médicos</SelectItem>
              {doctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atendido">Atendido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground ml-1">De</span>
                <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                    className="w-[140px] h-9 text-xs"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground ml-1">Até</span>
                <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                    className="w-[140px] h-9 text-xs"
                />
            </div>
            {(startDate || endDate) && (
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-9 w-9 mt-4" 
                   onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                   title="Limpar Datas"
                 >
                   <X className="h-4 w-4" />
                 </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead>Data / Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right text-blue-600">Repasse</TableHead>
                <TableHead className="text-right text-green-600">Taxa Site</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhum agendamento encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAppointments.map((apt) => {
                  const { totalValue, siteFee, doctorPayout, feePercent } = calculateFinancials(apt);

                  return (
                  <TableRow key={apt.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {format(parseISO(apt.appointment_date), 'dd/MM/yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {apt.appointment_time?.slice(0, 5)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono mt-1">
                            {apt.protocolo || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[180px]">
                        <span className="font-medium text-sm truncate" title={apt.patient?.full_name}>
                          {apt.patient?.full_name || 'Desconhecido'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {apt.patient?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col max-w-[180px]">
                        <span className="text-sm truncate" title={apt.medicos?.name}>
                          {apt.medicos?.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {apt.medicos?.specialty}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 text-xs">
                         <div className="flex flex-col items-end">
                             <span>{doctorPayout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                             <span className="text-[9px] text-gray-400">{100 - feePercent}%</span>
                         </div>
                    </TableCell>
                    <TableCell className="text-right text-green-600 text-xs">
                         <div className="flex flex-col items-end">
                             <span>{siteFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                             <span className="text-[9px] text-gray-400">{feePercent}%</span>
                         </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                            {getStatusBadge(apt.status)}
                            {getPaymentBadge(apt.pagamento_status)}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedAppointment(apt); setIsViewOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(apt)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {apt.status !== 'cancelado' && (
                             <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedAppointment(apt); setIsCancelOpen(true); }}>
                                <Ban className="mr-2 h-4 w-4" /> Cancelar
                             </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedAppointment(apt); setIsDeleteOpen(true); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4 px-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Anterior
                </Button>
                <div className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Próxima
                    <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>ID: {selectedAppointment?.id}</DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
             // eslint-disable-next-line
            (() => {
                const financialDetails = calculateFinancials(selectedAppointment);
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-primary">
                                <User className="w-4 h-4"/> Dados do Paciente
                            </h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Nome:</span> {selectedAppointment.patient?.full_name}</p>
                                <p><span className="text-muted-foreground">Email:</span> {selectedAppointment.patient?.email}</p>
                                <p><span className="text-muted-foreground">CPF:</span> {selectedAppointment.patient?.cpf || '-'}</p>
                                <p><span className="text-muted-foreground">WhatsApp:</span> {selectedAppointment.patient?.whatsapp || '-'}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-primary">
                                <Stethoscope className="w-4 h-4"/> Dados do Médico
                            </h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Nome:</span> {selectedAppointment.medicos?.name}</p>
                                <p><span className="text-muted-foreground">Especialidade:</span> {selectedAppointment.medicos?.specialty}</p>
                                <p><span className="text-muted-foreground">CRM:</span> {selectedAppointment.medicos?.crm} - {selectedAppointment.medicos?.uf}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-primary">
                                <CalendarIcon className="w-4 h-4"/> Detalhes da Consulta
                            </h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Protocolo:</span> {selectedAppointment.protocolo || 'N/A'}</p>
                                <p><span className="text-muted-foreground">Data:</span> {format(parseISO(selectedAppointment.appointment_date), 'dd/MM/yyyy')}</p>
                                <p><span className="text-muted-foreground">Horário:</span> {selectedAppointment.appointment_time}</p>
                                <p><span className="text-muted-foreground">Status:</span> {selectedAppointment.status}</p>
                                <p><span className="text-muted-foreground">Link da Sala:</span> {selectedAppointment.meeting_link ? <a href={selectedAppointment.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 underline">Acessar Sala</a> : 'Não gerado'}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-primary">
                                <DollarSign className="w-4 h-4"/> Financeiro
                            </h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Valor Total:</span> {financialDetails.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                <p><span className="text-muted-foreground">Repasse Médico ({100 - financialDetails.feePercent}%):</span> {financialDetails.doctorPayout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                <p><span className="text-muted-foreground">Taxa Site ({financialDetails.feePercent}%):</span> {financialDetails.siteFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                <p><span className="text-muted-foreground">Status Pagamento:</span> {selectedAppointment.pagamento_status || 'Pendente'}</p>
                                <p><span className="text-muted-foreground">ID Transação:</span> {selectedAppointment.checkout_session_id || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {selectedAppointment.observacoes_paciente && (
                        <div className="col-span-2 p-4 bg-amber-50 rounded-lg border border-amber-100">
                            <h4 className="font-semibold text-sm text-amber-800 mb-2">Observações do Paciente</h4>
                            <p className="text-sm text-amber-700">{selectedAppointment.observacoes_paciente}</p>
                        </div>
                    )}
                    </div>
                );
            })()
          )}
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Modifique os dados do agendamento. Cuidado ao alterar datas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={editForm.appointment_date}
                  onChange={(e) => setEditForm({...editForm, appointment_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input 
                  type="time" 
                  value={editForm.appointment_time}
                  onChange={(e) => setEditForm({...editForm, appointment_time: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status do Agendamento</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(val) => setEditForm({...editForm, status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="atendido">Atendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status do Pagamento</Label>
              <Select 
                value={editForm.pagamento_status} 
                onValueChange={(val) => setEditForm({...editForm, pagamento_status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago (Confirmado)</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="falha">Falha</SelectItem>
                  <SelectItem value="reembolsado">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle className="text-amber-600 flex items-center gap-2">
               <Ban className="w-5 h-5"/> Cancelar Agendamento
             </DialogTitle>
             <DialogDescription>
               Você tem certeza que deseja cancelar este agendamento?
               <br/><br/>
               <span className="font-semibold text-gray-900">O paciente será notificado sobre o cancelamento.</span>
             </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancelAppointment} disabled={processing}>
               {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle className="text-red-600 flex items-center gap-2">
               <Trash2 className="w-5 h-5"/> Excluir Agendamento
             </DialogTitle>
             <DialogDescription>
               Você tem certeza que deseja excluir permanentemente este registro?
               <br/><br/>
               <span className="font-semibold text-gray-900">Esta ação não pode ser desfeita.</span>
               <br/>
               Para apenas cancelar e manter o histórico, use a opção "Cancelar".
             </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
               {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL WIPE / RESET SYSTEM Dialog */}
      <Dialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
        <DialogContent className="border-red-200">
          <DialogHeader>
             <DialogTitle className="text-red-600 flex items-center gap-2">
               <AlertTriangle className="w-6 h-6 text-red-600"/> Resetar Todo o Sistema
             </DialogTitle>
             <DialogDescription className="text-gray-700 pt-2">
               ATENÇÃO: Você está prestes a apagar <strong>TODOS OS AGENDAMENTOS</strong> do sistema.
               <br/><br/>
               Esta ação irá excluir permanentemente:
               <ul className="list-disc pl-5 my-2 space-y-1 text-red-700 font-medium text-xs">
                   <li>Todos os agendamentos registrados</li>
                   <li>Histórico de guias médicas</li>
                   <li>Registros financeiros e de pagamentos</li>
                   <li>Logs de auditoria e notificações</li>
               </ul>
               <span className="font-bold">Esta ação é irreversível e deve ser usada apenas para reiniciar os testes ou limpar o banco de dados.</span>
             </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsWipeOpen(false)}>Cancelar, manter dados</Button>
            <Button variant="destructive" onClick={handleWipeAllData} disabled={processing} className="bg-red-600 hover:bg-red-700">
               {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Sim, Apagar Tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsControlPage;