import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserPlus, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
const HomePage = () => {
  const heroVariants = {
    hidden: {
      opacity: 0,
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  const stepsVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };
  const stepItemVariants = {
    hidden: {
      opacity: 0,
      x: -30
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };
  const steps = [{
    icon: <UserPlus className="w-8 h-8 text-primary" />,
    title: "1. Cadastre-se ou Faça Login",
    description: "Crie sua conta em segundos para ter acesso a todos os nossos especialistas."
  }, {
    icon: <Calendar className="w-8 h-8 text-primary" />,
    title: "2. Escolha o Médico e Horário",
    description: "Navegue pela nossa lista de profissionais e escolha o melhor horário para você."
  }, {
    icon: <CreditCard className="w-8 h-8 text-primary" />,
    title: "3. Confirme o Pagamento",
    description: "Finalize sua consulta com um pagamento seguro e receba a confirmação na hora."
  }];
  return <>
      <Helmet>
        <title>Click Teleconsulta - Sua saúde a um clique de distância</title>
      </Helmet>
      
      {/* 
          Hero Section Compressed:
          - Zero padding (py-1)
          - Increased text sizes for impact in small space
          - Minimal spacing
          - Compact dense layout
          - Full background image covering entire section
       */}
      <section className="relative w-full overflow-hidden py-8 md:py-12">
        {/* Background Image - Converted to img tag for visual editor compatibility */}
        {/* Using standard img tag ensures the visual editor recognizes this as an image element for upload/replacement */}
        <img src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/closeup-african-american-doctor-greeting-his-patient-video-call-mobile-phone-glpz4.jpg" alt="Background of medical consultation" className="absolute inset-0 w-full h-full object-cover z-0" />

        {/* Overlay to ensure text readability against the background */}
        <div className="absolute inset-0 bg-white/30 pointer-events-none z-0"></div> 
        
        <div className="container mx-auto px-4 relative z-10"> 
          <div className="flex flex-col items-center md:items-start justify-center min-h-[180px]">
            
            {/* Text Content - Centered on mobile, Left aligned on md+ */}
            <motion.div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 max-w-2xl mx-auto md:mx-0" variants={heroVariants} initial="hidden" animate="visible">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Consultas médicas online <span className="text-primary block md:inline">de forma fácil e segura</span>
              </h1>
              
              <p className="text-base md:text-lg text-slate-700 max-w-[500px] font-medium leading-snug">
                Cuide da sua saúde sem sair de casa.
              </p>
              
              <div className="pt-2">
                <Button asChild size="default" className="px-6 font-bold rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300">
                  <Link to="/agendamentos" className="flex items-center gap-2">
                    Agendar Consulta <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Right Column Removed - Image is now background */}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <motion.section className="py-12 bg-white" variants={stepsVariants} initial="hidden" animate="visible">
          <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-center mb-8 text-slate-900">Como funciona? É simples!</h2>
              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                  {steps.map((step, index) => <motion.div key={index} className="text-center group hover:-translate-y-1 transition-transform duration-300" variants={stepItemVariants}>
                          <div className="flex justify-center items-center mb-4 bg-blue-50 group-hover:bg-blue-100 w-16 h-16 rounded-2xl mx-auto transition-colors duration-300">
                              {step.icon}
                          </div>
                          <h3 className="text-lg font-bold mb-2 text-slate-900">{step.title}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed px-2">{step.description}</p>
                      </motion.div>)}
              </div>
          </div>
      </motion.section>
    </>;
};
export default HomePage;