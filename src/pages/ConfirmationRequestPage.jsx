import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ConfirmationRequestPage = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const email = location.state?.email;
  const customMessage = location.state?.customMessage;

  const handleResend = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível identificar o e-mail para reenvio.",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Falha ao reenviar",
        description: "Não foi possível reenviar o e-mail. Tente novamente mais tarde.",
      });
    } else {
      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada (e spam) novamente.",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center py-12"
    >
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <MailCheck className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            {customMessage ? "Verifique seu E-mail" : "Confirme seu E-mail"}
          </CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground">
            {customMessage || "Sua conta foi criada com sucesso!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2">
              Enviamos um link de confirmação para o endereço de e-mail:
            </p>
            <p className="font-semibold text-primary break-words">{email || 'seu e-mail'}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Por favor, clique no link em seu e-mail para ativar sua conta. Se não encontrar, verifique sua pasta de spam.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Voltar para o Início</Link>
            </Button>
            <Button onClick={handleResend} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reenviar E-mail
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConfirmationRequestPage;