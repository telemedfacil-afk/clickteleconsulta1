import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';

const TCLEConsentModal = ({ 
  open, 
  onOpenChange, 
  appointmentId, 
  consentToken,
  tcleVersion = "1.0",
  onConsentSuccess,
  isGuest = false // New prop for guest flow
}) => {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !isGuest) {
      retryPendingConsents();
    }
  }, [open, isGuest]);

  const retryPendingConsents = async () => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith("consentPending:"));
      for (const key of keys) {
        const payloadStr = localStorage.getItem(key);
        if (!payloadStr) continue;

        try {
          const payload = JSON.parse(payloadStr);
          supabase.functions.invoke('teleconsult-consent', { body: payload })
            .then(({ data, error }) => {
              if (!error && data?.ok) {
                 localStorage.removeItem(key);
              }
            });
        } catch (e) {
          console.error("Error parsing pending consent:", e);
        }
      }
    } catch (err) {
      console.error("Error in retry logic:", err);
    }
  };

  const handleAccept = async () => {
    if (!appointmentId || !consentToken) {
      toast({
        title: "Erro",
        description: "Erro: parâmetros inválidos",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Static snapshot marker for logs
    const tcleSnapshot = "Aceite via checkbox com link externo para versão ativa em /legal";

    try {
        if (isGuest) {
            // Guest Flow: Use PUBLIC edge function
            const { error } = await supabase.functions.invoke('teleconsult-consent-public', {
                body: {
                    appointment_id: appointmentId,
                    consent_token: consentToken,
                    checkbox_checked: true,
                    tcle_version: tcleVersion,
                    tcle_snapshot: tcleSnapshot
                }
            });

            if (error) throw new Error(error.message || "Falha ao registrar consentimento.");

        } else {
            // Regular User Flow
            await logConsentAsync(appointmentId, consentToken, tcleVersion, tcleSnapshot);
        }

        // Common Success Handling
        localStorage.setItem(`consentAccepted:${appointmentId}`, "true");
        
        toast({
          title: "Termos aceitos ✓",
          description: "Acesso à teleconsulta liberado.",
          className: "bg-green-600 text-white border-none"
        });

        if (onConsentSuccess) {
          onConsentSuccess();
        }
        
        onOpenChange(false);

    } catch (error) {
        console.error("Consent submission error:", error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível registrar o aceite. Tente novamente."
        });
        
        // For logged-in users, we might fallback to pending logic inside logConsentAsync,
        // but for guests we show error immediately as they rely on immediate access.
        if (!isGuest) {
            // Retry logic fallback happens inside logConsentAsync's catch block usually, 
            // but we called it above. If it fails there, it handles localStorage.
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const logConsentAsync = async (apptId, token, version, snapshot) => {
    const payload = {
      appointment_id: String(apptId),
      consent_token: String(token),
      checkbox_checked: true,
      tcle_version: version,
      tcle_snapshot: snapshot
    };

    try {
      const { data, error } = await supabase.functions.invoke('teleconsult-consent', {
        body: payload
      });
      if (error || (data && !data.ok)) throw new Error("API Error");
    } catch (err) {
      // Store for retry ONLY for logged in users who might be offline
      localStorage.setItem(`consentPending:${apptId}`, JSON.stringify(payload));
      // We don't throw here to allow optimistic UI update for logged users
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!isSubmitting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[500px] flex flex-col p-6 rounded-xl" onInteractOutside={(e) => { e.preventDefault(); }}>
        <DialogHeader className="mb-2 space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Consentimento para Teleconsulta
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Necessário para iniciar o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full rounded-lg border border-gray-100 p-4 bg-gray-50/50 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
                Para prosseguir com a teleconsulta, você precisa concordar com nossos documentos legais:
            </p>
            <ul className="space-y-2 ml-1">
                <li className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-blue-600" />
                    <Link 
                        to="/legal?doc=terms_of_service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline font-medium"
                    >
                        Termos de Serviço
                    </Link>
                </li>
                <li className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-blue-600" />
                    <Link 
                        to="/legal?doc=privacy_policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline font-medium"
                    >
                        Política de Privacidade (LGPD)
                    </Link>
                </li>
            </ul>
        </div>

        <div className="space-y-5">
          <div className="flex items-start space-x-3 bg-white p-3 rounded border border-gray-200">
            <Checkbox 
              id="tcle-accept" 
              checked={checkboxChecked}
              onCheckedChange={setCheckboxChecked}
              className="mt-0.5 data-[state=checked]:bg-blue-600 border-gray-300 h-4 w-4 rounded shadow-sm"
            />
            <div className="grid gap-1 leading-none">
              <Label 
                htmlFor="tcle-accept" 
                className="text-sm font-medium leading-snug cursor-pointer text-gray-700 select-none"
              >
                Confirmo que li e aceito os Termos de Serviço e a Política de Privacidade.
              </Label>
            </div>
          </div>

          <Button 
            onClick={handleAccept} 
            disabled={!checkboxChecked || isSubmitting}
            className={`w-full font-semibold h-10 rounded-lg text-sm transition-all duration-200 shadow-sm ${
              checkboxChecked && !isSubmitting ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Aceitar e Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TCLEConsentModal;