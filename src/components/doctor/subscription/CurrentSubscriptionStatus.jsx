import React from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react';
import { getPlanDetails } from '@/config/plansConfig';

const CurrentSubscriptionStatus = ({ subscriptionData, onChangePlanClick }) => {
  const { 
    subscription_plan, 
    subscription_status, 
    subscription_start_date, 
    subscription_renewal_date,
    subscription_payment_method 
  } = subscriptionData;

  const planDetails = getPlanDetails(subscription_plan);
  const isActive = subscription_status === 'active';

  // Helper to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
      <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Status da Assinatura
          </h2>
          <p className="text-sm text-gray-500">Gerencie os detalhes do seu plano atual.</p>
        </div>
        <Badge variant={isActive ? "success" : "destructive"} className={`text-xs px-3 py-1 ${isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700'}`}>
          {isActive ? 'ATIVO' : 'INATIVO / EXPIRADO'}
        </Badge>
      </div>

      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano Atual</span>
          <div className="flex items-center gap-2">
             <div className="font-bold text-xl text-gray-900">{planDetails.name}</div>
          </div>
          <div className="text-xs text-gray-500">{planDetails.description}</div>
        </div>

        <div className="space-y-1">
           <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
             <Calendar className="w-3 h-3" /> Renovação
           </span>
           <div className="font-semibold text-gray-900">{formatDate(subscription_renewal_date)}</div>
           <div className="text-xs text-blue-600 font-medium">Renova automaticamente</div>
        </div>

        <div className="space-y-1">
           <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
             <CreditCard className="w-3 h-3" /> Método de Pagamento
           </span>
           <div className="font-semibold text-gray-900 capitalize">
             {subscription_payment_method === 'credit_card' ? 'Cartão de Crédito' : 
              subscription_payment_method === 'pix' ? 'PIX' : 
              subscription_payment_method || 'Não definido'}
           </div>
           <Button variant="link" className="h-auto p-0 text-xs text-blue-600" onClick={onChangePlanClick}>
             Alterar método
           </Button>
        </div>

        <div className="flex items-center justify-end">
          <Button onClick={onChangePlanClick} className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm">
            Alterar Plano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentSubscriptionStatus;