import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, LayoutGrid } from 'lucide-react';

const DoctorIntegrations = () => {
    return (
        <div className="space-y-1 max-w-2xl mx-auto">
             <h1 className="text-base font-semibold tracking-tight text-gray-800">Integrações do Sistema</h1>
            
             <Card className="dashboard-card overflow-hidden rounded-lg">
                <CardHeader className="px-2 pt-2 pb-1 border-b border-gray-100">
                    <CardTitle className="dashboard-title flex items-center gap-1 text-sm">
                        <LayoutGrid className="text-primary w-3.5 h-3.5"/> Integrações: Doctoralia e Feegow
                    </CardTitle>
                    <CardDescription className="dashboard-subtitle mt-0.5 text-[10px]">
                        Acesso rápido aos seus painéis externos. Clique na metade correspondente para abrir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative w-full max-w-full mx-auto rounded-md overflow-hidden shadow-sm border border-gray-100 transition-transform hover:scale-[1.005] duration-300">
                        <img 
                            src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/f75d1b6a374ac95a78d0a86f1b62e112.webp" 
                            alt="Integração Doctoralia e Feegow"
                            className="w-full h-auto max-h-24 object-cover block"
                        />
                        
                        <div className="absolute inset-0 flex">
                            <a 
                                href="https://docplanner.doctoralia.com.br/#/calendar/day" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-1/2 h-full hover:bg-black/5 hover:backdrop-brightness-95 transition-all duration-300 flex items-center justify-center group"
                                aria-label="Acessar Agenda Doctoralia"
                                title="Acessar Agenda Doctoralia"
                            >
                                <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm transform scale-75 group-hover:scale-100 duration-300" />
                            </a>

                            <a 
                                href="https://app.feegow.com/v8/?P=ListaEspera&Pers=1" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-1/2 h-full hover:bg-black/5 hover:backdrop-brightness-95 transition-all duration-300 flex items-center justify-center group"
                                aria-label="Acessar Lista de Espera Feegow"
                                title="Acessar Lista de Espera Feegow"
                            >
                                <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm transform scale-75 group-hover:scale-100 duration-300" />
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorIntegrations;