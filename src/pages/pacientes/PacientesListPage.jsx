
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Calendar, ChevronRight, ChevronLeft, User, RefreshCw, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PacientesListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [doctorId, setDoctorId] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const getDoctorId = async () => {
            if (user) {
                const { data } = await supabase.from('medicos').select('id').eq('user_id', user.id).single();
                if (data) setDoctorId(data.id);
            }
        };
        getDoctorId();
    }, [user]);

    const fetchPatients = async () => {
        if (!doctorId) return;
        setLoading(true);

        try {
            // Fetch unique patients from appointments
            // We select columns that definitely exist in perfis_usuarios table
            const { data: appointments, error } = await supabase
                .from('agendamentos')
                .select(`
                    patient_id,
                    appointment_date,
                    horario_inicio,
                    status,
                    perfis_usuarios:patient_id (
                        id,
                        full_name,
                        email,
                        whatsapp,
                        cpf
                    )
                `)
                .eq('medico_id', doctorId)
                .order('horario_inicio', { ascending: false });

            if (error) throw error;

            // Process appointments to get unique patients with latest data
            const patientsMap = new Map();

            appointments.forEach(appt => {
                if (!appt.patient_id || !appt.perfis_usuarios) return;

                if (!patientsMap.has(appt.patient_id)) {
                    patientsMap.set(appt.patient_id, {
                        ...appt.perfis_usuarios,
                        last_consultation: appt.horario_inicio,
                        total_appointments: 1,
                        last_status: appt.status
                    });
                } else {
                    const patient = patientsMap.get(appt.patient_id);
                    patient.total_appointments += 1;
                    // Since we ordered by desc, the first one encountered is the latest
                }
            });

            // Convert map to array and sort alphabetically by name
            const patientsList = Array.from(patientsMap.values()).sort((a, b) => {
                const nameA = (a.full_name || '').toLowerCase();
                const nameB = (b.full_name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            setPatients(patientsList);

        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [doctorId]);

    const filteredPatients = useMemo(() => {
        return patients.filter(p => 
            (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.cpf || '').includes(searchTerm) ||
            (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [patients, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

    const handlePatientClick = (patientId) => {
        navigate(`/dashboard/medico/pacientes/${patientId}`);
    };

    if (!doctorId) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 pb-10">
            {/* Header Section */}
            <div className="flex flex-col space-y-1">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Meus Pacientes</h1>
                <p className="text-xs text-slate-500">Gerencie o histórico e prontuários dos seus pacientes.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar por nome, CPF ou email..." 
                        className="pl-10 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                    />
                </div>
                <Button variant="outline" onClick={fetchPatients} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* List */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white ring-1 ring-slate-100">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="w-[300px] pl-6">Paciente</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Última Consulta</TableHead>
                                <TableHead>Status Recente</TableHead>
                                <TableHead className="text-right pr-6">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: itemsPerPage }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5} className="h-16 text-center">
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="h-2 w-full bg-slate-100 rounded animate-pulse max-w-[200px]"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-light">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <User className="w-8 h-8 opacity-20" />
                                            <span>Nenhum paciente encontrado.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPatients.map((patient) => (
                                    <TableRow 
                                        key={patient.id} 
                                        className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                                        onClick={() => handlePatientClick(patient.id)}
                                    >
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-slate-100">
                                                    {/* Removed AvatarImage src since avatar_url doesn't exist */}
                                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                                        {patient.full_name 
                                                            ? patient.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                                            : 'PAC'
                                                        }
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">
                                                        {patient.full_name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        ID: {patient.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs truncate max-w-[150px]" title={patient.email}>{patient.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs">{patient.whatsapp || '-'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {patient.last_consultation 
                                                    ? format(new Date(patient.last_consultation), "dd/MM/yyyy", { locale: ptBR })
                                                    : '---'
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={patient.last_status === 'confirmado' ? 'success' : 'secondary'} className="capitalize font-normal text-xs">
                                                {patient.last_status === 'confirmado' ? 'Confirmado' : patient.last_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-primary">
                                                <ChevronRight className="h-5 w-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            <div className="text-sm text-slate-500">
                                Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(endIndex, filteredPatients.length)}</span> de <span className="font-medium">{filteredPatients.length}</span> pacientes
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                                </Button>
                                <div className="text-sm font-medium text-slate-600 px-2">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PacientesListPage;
