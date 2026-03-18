import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle2, UserCheck, PlayCircle } from 'lucide-react';
import { useTelemedicineRoom } from '@/hooks/useTelemedicineRoom';
import { format } from 'date-fns';

const TelemedicineStatusIndicator = ({ appointmentId }) => {
  // We can use the hook here just to get status, even if we don't use actions
  const { statusSala, loading } = useTelemedicineRoom(appointmentId);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'medico_iniciou':
        return {
          label: 'Médico na Sala',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: <PlayCircle className="w-3 h-3 mr-1" />
        };
      case 'paciente_entrou': // Note: This state might need to be explicitly set in DB if we want to track it persistently as a status change
      case 'em_andamento':
        return {
          label: 'Em Andamento',
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: <UserCheck className="w-3 h-3 mr-1" />
        };
      case 'finalizado':
        return {
          label: 'Finalizado',
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />
        };
      default:
        return {
          label: 'Aguardando Início',
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: <Clock className="w-3 h-3 mr-1" />
        };
    }
  };

  const config = getStatusConfig(statusSala);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Status da Sala:</span>
      <Badge variant="outline" className={`${config.color} flex items-center gap-1 px-3 py-1 shadow-sm`}>
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : config.icon}
        {config.label}
      </Badge>
    </div>
  );
};

export default TelemedicineStatusIndicator;