import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, CheckCheck, Clock, Calendar, User, FileText, Phone } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

const NotificationPanel = ({ isOpen, onClose, notifications, unreadCount, markAsRead, markAllAsRead, loading }) => {
  const [appointmentDetails, setAppointmentDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch detailed appointment info when notifications are loaded or panel is opened
  useEffect(() => {
    const fetchDetails = async () => {
      if (!isOpen || notifications.length === 0) return;

      // Use related_id as fallback for appointment_id since metadata might not exist
      const appointmentIdsToFetch = notifications
        .map(n => n.metadata?.appointment_id || n.related_id)
        .filter(id => id && !appointmentDetails[id]); // Only fetch what we don't have
      
      // Filter out duplicates and undefined
      const uniqueIds = [...new Set(appointmentIdsToFetch)].filter(Boolean);

      if (uniqueIds.length === 0) return;

      setLoadingDetails(true);
      try {
        const { data, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                appointment_date,
                appointment_time,
                protocolo,
                status,
                patient:perfis_usuarios(full_name, whatsapp, email),
                guest:guest_patients(name, phone, email)
            `)
            .in('id', uniqueIds);

        if (error) {
            console.error('Error fetching appointment details:', error);
            return;
        }

        const newDetails = {};
        data?.forEach(appt => {
            newDetails[appt.id] = appt;
        });

        setAppointmentDetails(prev => ({ ...prev, ...newDetails }));
      } catch (err) {
        console.error("Failed to fetch details", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [isOpen, notifications, appointmentDetails]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[450px] bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="h-5 w-5 text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <h2 className="font-semibold text-lg">Notificações</h2>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5">
                    {unreadCount} nova(s)
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-b bg-muted/20 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs text-muted-foreground hover:text-primary gap-1.5 h-7"
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas como lidas
                </Button>
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-0">
                {loading && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">Carregando...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-6">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Bell className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-medium text-foreground">Tudo limpo!</h3>
                    <p className="text-sm mt-1">Você não tem novas notificações.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => {
                        // Use related_id as fallback
                        const apptId = notification.metadata?.appointment_id || notification.related_id;
                        const detail = appointmentDetails[apptId];
                        const patientName = detail?.patient?.full_name || detail?.guest?.name || "Paciente";
                        const patientContact = detail?.patient?.whatsapp || detail?.guest?.phone || detail?.patient?.email || detail?.guest?.email;

                        return (
                          <div 
                            key={notification.id} 
                            className={cn(
                                "p-4 hover:bg-muted/30 transition-colors relative group bg-white",
                                !notification.is_read && "bg-blue-50/30"
                            )}
                          >
                            <div className="flex gap-3">
                              {!notification.is_read && (
                                <div className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              )}
                              
                              <div className="space-y-2 flex-1 min-w-0">
                                <p className="text-sm leading-snug font-medium text-foreground">
                                  {notification.message || notification.mensagem}
                                </p>
                                
                                {detail ? (
                                    <div className="bg-card/50 rounded-md border p-2 text-xs space-y-1 mt-1">
                                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                                            <User className="h-3 w-3" />
                                            <span>{patientName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format(new Date(detail.appointment_date + 'T' + detail.appointment_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                                        </div>
                                        {detail.protocolo && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <FileText className="h-3 w-3" />
                                                <span className="font-mono">{detail.protocolo}</span>
                                            </div>
                                        )}
                                        {patientContact && (
                                             <div className="flex items-center gap-2 text-gray-500">
                                                <Phone className="h-3 w-3" />
                                                <span>{patientContact}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    apptId && (
                                        <div className="mt-1">
                                            {loadingDetails ? (
                                                <Skeleton className="h-16 w-full" />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">Detalhes do agendamento...</span>
                                            )}
                                        </div>
                                    )
                                )}

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center pl-2">
                                   <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                    title="Marcar como lida"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                              </div>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;