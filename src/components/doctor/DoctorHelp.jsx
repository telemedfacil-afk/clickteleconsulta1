import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const DoctorHelp = () => {
    return (
        <div className="space-y-1 max-w-4xl mx-auto">
             <h1 className="text-base font-normal tracking-tight text-gray-800">Central de Ajuda</h1>
            
            <Card className="dashboard-card bg-gradient-to-br from-primary/5 to-transparent border-primary/10 rounded-lg p-0">
                <CardContent className="text-center py-4 px-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 mb-1">Como podemos ajudar você hoje?</h2>
                     <p className="text-gray-500 font-light max-w-md mx-auto mb-3 text-xs">
                        Nossa equipe de suporte está pronta para auxiliar em dúvidas sobre agendamentos, financeiro ou uso da plataforma.
                     </p>
                     <Button asChild className="bg-primary hover:bg-primary/90 shadow-sm rounded-full px-6 h-8 text-xs">
                        <Link to="/suporte">Acessar FAQ e Tutoriais <ArrowRight className="ml-1 w-3 h-3"/></Link>
                     </Button>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-2">
                <Card className="dashboard-card hover:border-primary/30 group cursor-pointer transition-all rounded-lg p-0">
                    <CardContent className="flex items-start gap-2 p-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-800 mb-0.5">Suporte por E-mail</h3>
                            <p className="text-[10px] font-light text-gray-500 mb-1">Para questões mais detalhadas ou envio de documentos.</p>
                            <a href="mailto:suporte@clickteleconsulta.online" className="text-xs font-medium text-primary hover:underline">suporte@clickteleconsulta.online</a>
                        </div>
                    </CardContent>
                </Card>

                <a 
                    href="https://wa.me/552139550563" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block"
                >
                    <Card className="dashboard-card hover:border-green-500/30 group cursor-pointer transition-all h-full rounded-lg p-0">
                        <CardContent className="flex items-start gap-2 p-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <MessageCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-800 mb-0.5">WhatsApp Oficial</h3>
                                <p className="text-[10px] font-light text-gray-500 mb-1">Atendimento rápido em horário comercial.</p>
                                <p className="text-xs font-medium text-green-600 hover:underline">(21) 3955-0563</p>
                            </div>
                        </CardContent>
                    </Card>
                </a>
            </div>
        </div>
    );
};

export default DoctorHelp;