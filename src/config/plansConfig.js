export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price_in_cents: 0,
    billing_period: 'mensal',
    description: 'Ideal para quem está começando a atender.',
    features: [
      'Agenda básica',
      'Prontuário eletrônico simples',
      'Até 50 consultas/mês',
      'Suporte por email',
      'Perfil público básico'
    ],
    highlight: false,
    color: 'blue'
  },
  {
    id: 'professional',
    name: 'Profissional',
    price_in_cents: 9990, // R$ 99,90
    billing_period: 'mensal',
    description: 'Para médicos e clínicas em crescimento.',
    features: [
      'Tudo do Básico',
      'Agenda avançada com lembretes',
      'Prescrição digital (Memed)',
      'Consultas ilimitadas',
      'Gestão financeira completa',
      'Suporte prioritário via WhatsApp',
      'Telemedicina HD ilimitada'
    ],
    highlight: true,
    color: 'purple'
  },
  {
    id: 'premium',
    name: 'Premium',
    price_in_cents: 19990, // R$ 199,90
    billing_period: 'mensal',
    description: 'Gestão total e máxima visibilidade.',
    features: [
      'Tudo do Profissional',
      'Personalização de marca (White label)',
      'Relatórios avançados de BI',
      'Gerente de conta dedicado',
      'Destaque nas buscas de médicos',
      'Integração via API',
      'Marketing automatizado'
    ],
    highlight: false,
    color: 'orange'
  }
];

export const getPlanDetails = (planId) => {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
};