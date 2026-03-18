import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SubscriptionPlansDisplay from '@/components/doctor/subscription/SubscriptionPlansDisplay';
import CurrentSubscriptionStatus from '@/components/doctor/subscription/CurrentSubscriptionStatus';
import PaymentMethodSelector from '@/components/doctor/subscription/PaymentMethodSelector';
import { SUBSCRIPTION_PLANS, getPlanDetails } from '@/config/plansConfig';
const DoctorSubscriptionPage = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [doctorId, setDoctorId] = useState(null);

  // State for the modification flow
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit_card');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  useEffect(() => {
    if (user) fetchSubscriptionData();
  }, [user]);
  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('medicos').select('id, subscription_plan, subscription_status, subscription_start_date, subscription_renewal_date, subscription_payment_method').eq('user_id', user.id).single();
      if (error) throw error;
      setDoctorId(data.id);
      setSubscriptionData(data);
      setSelectedPlanId(data.subscription_plan || 'basic');
      setSelectedPaymentMethod(data.subscription_payment_method || 'credit_card');
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar",
        description: "Não foi possível carregar os dados da assinatura."
      });
    } finally {
      setLoading(false);
    }
  };
  const handlePlanSelection = planId => {
    setSelectedPlanId(planId);
    // If selecting a different plan, verify payment method is needed
    if (planId !== subscriptionData?.subscription_plan) {
      // Can scroll to payment method or show toast
    }
  };
  const handleInitiateChange = () => {
    if (!selectedPlanId) return;

    // Prevent "change" if plan matches current and payment matches current
    if (selectedPlanId === subscriptionData.subscription_plan && selectedPaymentMethod === subscriptionData.subscription_payment_method) {
      toast({
        title: "Nenhuma alteração",
        description: "Você já está usando este plano e método de pagamento.",
        variant: "default"
      });
      return;
    }
    setIsConfirmDialogOpen(true);
  };
  const confirmSubscriptionUpdate = async () => {
    try {
      setSaving(true);
      const planDetails = getPlanDetails(selectedPlanId);

      // In a real app, here we would integrate with Stripe/Payment Gateway
      // For now, we simulate the DB update directly

      const updates = {
        subscription_plan: selectedPlanId,
        subscription_payment_method: selectedPaymentMethod,
        subscription_status: 'active',
        // Assume immediate activation for demo
        // If plan changed, reset dates (simplified logic)
        ...(selectedPlanId !== subscriptionData.subscription_plan ? {
          subscription_start_date: new Date().toISOString(),
          subscription_renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
        } : {})
      };
      const {
        error
      } = await supabase.from('medicos').update(updates).eq('id', doctorId);
      if (error) throw error;
      toast({
        variant: "success",
        title: "Assinatura atualizada!",
        description: `Você agora está no plano ${planDetails.name}.`
      });
      await fetchSubscriptionData(); // Refresh data
      setIsConfirmDialogOpen(false);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        variant: "destructive",
        title: "Falha na atualização",
        description: "Ocorreu um erro ao atualizar sua assinatura."
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="w-full h-[50vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500">Carregando informações da assinatura...</p>
            </div>;
  }
  const selectedPlanDetails = getPlanDetails(selectedPlanId);
  const hasChanges = selectedPlanId !== subscriptionData.subscription_plan || selectedPaymentMethod !== subscriptionData.subscription_payment_method;
  return <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Minha Assinatura</h1>
                <p className="text-muted-foreground text-lg">Gerencie seu plano e método de pagamento.</p>
            </div>

            {/* Current Status Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CurrentSubscriptionStatus subscriptionData={subscriptionData} onChangePlanClick={() => document.getElementById('plans-section').scrollIntoView({
        behavior: 'smooth'
      })} />
            </section>

            <Separator className="my-8" />

            {/* Plans Selection Section */}
            <section id="plans-section" className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="text-2xl font-bold text-gray-900">Escolha o plano ideal para você</h2>
                    <p className="text-gray-500 mt-2">Flexibilidade total. Mude de plano quando quiser.</p>
                </div>
                
                <SubscriptionPlansDisplay currentPlanId={subscriptionData.subscription_plan} selectedPlanId={selectedPlanId} onSelectPlan={handlePlanSelection} loading={saving} />
            </section>

            {/* Payment Method Section - Only show if changes or specific condition */}
            <section className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Configuração de Pagamento</h3>
                        <p className="text-sm text-gray-500">Escolha como deseja pagar pela sua assinatura.</p>
                    </div>
                </div>
                
                <div className="pl-0 sm:pl-12">
                    <PaymentMethodSelector selectedMethod={selectedPaymentMethod} onSelectMethod={setSelectedPaymentMethod} />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
                    <Button size="lg" onClick={handleInitiateChange} disabled={!hasChanges || saving} className={selectedPlanDetails.id === 'professional' || selectedPlanDetails.id === 'premium' ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md" : ""}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : !hasChanges ? "Nenhuma Alteração" : "Confirmar Alterações"}
                    </Button>
                </div>
            </section>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Alteração de Plano</DialogTitle>
                        <DialogDescription>
                            Você está prestes a alterar sua assinatura. Revise os detalhes abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Novo Plano:</span>
                            <span className="font-bold text-gray-900">{selectedPlanDetails.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Valor Mensal:</span>
                            <span className="font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(selectedPlanDetails.price_in_cents / 100)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Método de Pagamento:</span>
                            <span className="font-medium text-gray-900 capitalize">
                                {selectedPaymentMethod.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmSubscriptionUpdate} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Confirmar e Assinar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>;
};
export default DoctorSubscriptionPage;