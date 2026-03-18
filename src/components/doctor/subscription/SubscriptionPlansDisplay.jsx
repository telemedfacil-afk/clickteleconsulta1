import React from 'react';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_PLANS } from '@/config/plansConfig';
import { cn } from '@/lib/utils';

const SubscriptionPlansDisplay = ({ currentPlanId, selectedPlanId, onSelectPlan, loading }) => {
  const formatPrice = (cents) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        const isSelected = selectedPlanId === plan.id;
        const isHighlight = plan.highlight;

        return (
          <Card 
            key={plan.id} 
            className={cn(
              "relative flex flex-col transition-all duration-300 hover:shadow-xl border-2",
              isHighlight ? "border-purple-500 shadow-md scale-105 z-10" : "border-gray-100 hover:border-gray-300",
              isSelected && !isCurrent ? "ring-2 ring-primary ring-offset-2 border-primary" : ""
            )}
          >
            {isHighlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> MAIS POPULAR
              </div>
            )}
            
            <CardHeader className={cn("text-center pb-2", isHighlight ? "pt-8" : "")}>
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="min-h-[40px] flex items-center justify-center">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col items-center">
              <div className="mb-6 text-center">
                <span className="text-4xl font-extrabold text-gray-900">
                  {formatPrice(plan.price_in_cents)}
                </span>
                <span className="text-gray-500 text-sm font-medium">/{plan.billing_period}</span>
              </div>

              <div className="w-full space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="mt-0.5 rounded-full bg-green-100 p-1 shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-left leading-tight">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter className="pt-4 pb-6">
              <Button 
                className={cn(
                  "w-full font-bold transition-all", 
                  isCurrent ? "bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-default" : 
                  isHighlight ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200" :
                  "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                )}
                onClick={() => !isCurrent && onSelectPlan(plan.id)}
                disabled={loading || isCurrent}
                variant={isHighlight && !isCurrent ? "default" : "outline"}
              >
                {isCurrent ? "Seu Plano Atual" : isSelected ? "Plano Selecionado" : "Selecionar Plano"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default SubscriptionPlansDisplay;