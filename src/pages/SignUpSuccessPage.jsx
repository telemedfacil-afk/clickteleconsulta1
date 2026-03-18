import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';

const SignUpSuccessPage = () => {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <>
      <Helmet>
        <title>Cadastro Realizado com Sucesso - Click Teleconsulta</title>
        <meta name="description" content="Seu cadastro foi realizado com sucesso. Verifique seu e-mail para confirmar sua conta." />
      </Helmet>
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
              Cadastro realizado com sucesso!
            </CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
              Obrigado por se juntar a nós.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2">
                Enviamos um link de confirmação para o seu e-mail:
              </p>
              <p className="font-semibold text-primary break-words">{email || 'seu e-mail'}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Por favor, clique no link para ativar sua conta. Se não encontrar, verifique sua pasta de spam.
            </p>
            
            <Button asChild className="w-full">
              <Link to="/">Voltar para o Início</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default SignUpSuccessPage;