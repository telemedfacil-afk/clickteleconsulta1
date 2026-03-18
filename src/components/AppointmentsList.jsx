import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Phone, Mail, Video, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const statusColors = {
  agendada: 'bg-green-100 text-green-700',
  confirmada: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-red-100 text-red-700',
  concluida: 'bg-gray-100 text-gray-700'
};

const statusLabels = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  concluida: 'Concluída'
};

export function AppointmentsList({ appointments, onUpdateAppointment, onDeleteAppointment }) {
  const { toast } = useToast();

  const handleStatusChange = (appointmentId, newStatus) => {
    onUpdateAppointment(appointmentId, { status: newStatus });
    toast({
      title: "Status atualizado",
      description: `Consulta marcada como ${statusLabels[newStatus].toLowerCase()}.`
    });
  };

  const handleDelete = (appointmentId, patientName) => {
    onDeleteAppointment(appointmentId);
    toast({
      title: "Consulta removida",
      description: `Consulta de ${patientName} foi removida da agenda.`
    });
  };

  const handleVideoCall = () => {
    toast({
      title: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  if (appointments.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma consulta agendada para esta data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-green-600" />
        <span className="text-lg font-semibold text-gray-800">
          Consultas Agendadas ({appointments.length})
        </span>
      </div>

      {appointments.map((appointment, index) => (
        <motion.div
          key={appointment.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="appointment-card hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  {appointment.patientName}
                </CardTitle>
                <Badge className={statusColors[appointment.status]}>
                  {statusLabels[appointment.status]}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{appointment.date} às {appointment.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{appointment.patientEmail}</span>
                  </div>
                  
                  {appointment.patientPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.patientPhone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Especialidade:</span>
                    <span className="ml-2 text-gray-600">{appointment.specialty}</span>
                  </div>
                  
                  {appointment.symptoms && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Sintomas:</span>
                      <p className="text-gray-600 mt-1 text-xs leading-relaxed">
                        {appointment.symptoms}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {appointment.status === 'agendada' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(appointment.id, 'confirmada')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Confirmar
                  </Button>
                )}
                
                {(appointment.status === 'confirmada' || appointment.status === 'agendada') && (
                  <Button
                    size="sm"
                    onClick={handleVideoCall}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                  >
                    <Video className="w-4 h-4" />
                    Iniciar Consulta
                  </Button>
                )}
                
                {appointment.status === 'confirmada' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(appointment.id, 'concluida')}
                  >
                    Marcar como Concluída
                  </Button>
                )}
                
                {appointment.status !== 'cancelada' && appointment.status !== 'concluida' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(appointment.id, 'cancelada')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancelar
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(appointment.id, appointment.patientName)}
                  className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}