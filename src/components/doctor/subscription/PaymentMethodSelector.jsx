import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, QrCode, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
  const methods = [
    {
      id: 'credit_card',
      title: 'Cartão de Crédito',
      description: 'Cobrança mensal automática',
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'pix',
      title: 'PIX',
      description: 'Pagamento instantâneo mensal',
      icon: QrCode,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      id: 'boleto',
      title: 'Boleto Bancário',
      description: 'Processamento em até 3 dias',
      icon: Building2,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">Selecione o método de pagamento</h3>
      <RadioGroup value={selectedMethod} onValueChange={onSelectMethod} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {methods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
                <div key={method.id}>
                    <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
                    <Label
                        htmlFor={method.id}
                        className={cn(
                            "flex flex-col items-center justify-between rounded-xl border-2 p-4 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all",
                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 bg-white"
                        )}
                    >
                        <div className={cn("mb-3 p-3 rounded-full", method.bg)}>
                            <method.icon className={cn("w-6 h-6", method.color)} />
                        </div>
                        <div className="text-center space-y-1">
                            <span className="font-semibold text-gray-900 block">{method.title}</span>
                            <span className="text-xs text-gray-500 font-normal block">{method.description}</span>
                        </div>
                        {isSelected && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-in fade-in zoom-in" />
                        )}
                    </Label>
                </div>
            );
        })}
      </RadioGroup>
    </div>
  );
};

export default PaymentMethodSelector;