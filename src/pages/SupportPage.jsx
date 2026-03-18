import React from 'react';
import { Helmet } from 'react-helmet';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
const SupportPage = () => {
  return <>
            <Helmet>
                <title>Suporte - Click Teleconsulta</title>
            </Helmet>
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Precisa de Ajuda?</h1>
                    <p className="mt-4 text-lg text-muted-foreground">Estamos aqui para te ajudar. Escolha a melhor forma de contato para você.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="text-primary" /> E-mail
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Envie-nos um e-mail com sua dúvida ou problema. Responderemos o mais breve possível.</p>
                            <a href="mailto:suporte@clickteleconsulta.com" className="font-semibold text-primary mt-2 block">Email</a>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="text-primary" /> WhatsApp
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Fale conosco pelo nosso WhatsApp:</p>
                            <a href="https://wa.me/5521998902451" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-2 block">(21) 99890-2451</a>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-12 text-center">
                    <h2 className="text-2xl font-bold">Horário de Atendimento</h2>
                    <p className="text-muted-foreground mt-2">Segunda a Sexta, das 08:00 às 18:00.</p>
                </div>
            </div>
        </>;
};
export default SupportPage;