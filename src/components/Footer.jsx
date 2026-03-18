import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center gap-2">
                <Stethoscope className="w-7 h-7 text-primary" />
                <span className="text-lg font-bold text-gray-800">Click Teleconsulta</span>
              </Link>
            </div>
            <div className="flex flex-col space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">C&C ASSISTÊNCIA MÉDICA LTDA</span>
                </div>
                <p className="text-xs text-muted-foreground">CNPJ: 51.239.735/0001-03</p>
                <img src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/chatgpt-image-24-de-nov.-de-2025-14_28_54-5gBag.png" alt="Logo C&C Assistência Médica" className="w-24 h-auto mt-2 opacity-90" />
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="font-bold text-gray-900 text-sm uppercase tracking-wider">Legal</p>
            <nav className="flex flex-col space-y-2.5">
              <Link 
                to="/legal?doc=terms_of_service" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-primary transition-colors hover:underline"
              >
                Termos de Serviço
              </Link>
              <Link 
                to="/legal?doc=privacy_policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-primary transition-colors hover:underline"
              >
                Política de Privacidade (LGPD)
              </Link>
            </nav>
            <Button variant="outline" size="sm" asChild className="border-primary/20 hover:bg-primary/5 text-primary text-xs w-fit">
                <Link to="/acesso-medico">Acesso para Médicos</Link>
            </Button>
          </div>

          <div className="space-y-4">
            <p className="font-bold text-gray-900 text-sm uppercase tracking-wider">Contato e Suporte</p>
            <div className="flex flex-col space-y-2 text-sm text-gray-600">
              <p>Email: suporte@clickteleconsulta.online</p>
              <p>WhatsApp: (21) 3955-0563</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="gap-2 h-9 border-primary/20 hover:bg-primary/5 text-primary text-xs">
                    <a href="mailto:suporte@clickteleconsulta.online">
                        <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-2 h-9 border-green-500/30 hover:bg-green-50 text-green-600 hover:text-green-700 text-xs">
                    <a href="https://wa.me/552139550563" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                </Button>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>Atendimentos em telemedicina com ética, segurança e respeito.</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} Click Teleconsulta. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;