import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Laptop, Globe, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TelemedicineLogsTable = ({ appointmentId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!appointmentId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('agendamento_logs')
          .select('*')
          .eq('agendamento_id', appointmentId)
          .in('action', ['doctor_started_consultation', 'patient_entered_consultation', 'tcle_accepted'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [appointmentId]);

  const translateAction = (action) => {
    switch (action) {
      case 'doctor_started_consultation': return 'Médico Iniciou Atendimento';
      case 'patient_entered_consultation': return 'Paciente Entrou na Sala';
      case 'tcle_accepted': return 'Paciente Aceitou TCLE';
      default: return action;
    }
  };

  if (loading) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  if (logs.length === 0) return null;

  return (
    <Card className="mt-6 border-muted bg-muted/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <History className="w-4 h-4" /> Registro de Auditoria (Logs)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="h-8 hover:bg-transparent">
                <TableHead className="w-[200px] text-xs">Evento</TableHead>
                <TableHead className="w-[180px] text-xs">Data/Hora</TableHead>
                <TableHead className="text-xs">Detalhes Técnicos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="h-10 text-xs">
                  <TableCell className="font-medium">{translateAction(log.action)}</TableCell>
                  <TableCell>
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[10px] break-all">
                    {log.metadata && (
                      <div className="flex flex-col gap-1">
                        {log.metadata.ip && (
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> IP: {log.metadata.ip}</span>
                        )}
                        {log.metadata.userAgent && (
                          <span className="flex items-center gap-1"><Laptop className="w-3 h-3" /> UA: {log.metadata.userAgent}</span>
                        )}
                         {!log.metadata.ip && !log.metadata.userAgent && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> Role: {log.actor_role || log.metadata.role}</span>
                         )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelemedicineLogsTable;