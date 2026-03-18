# SETUP REPORT — Click Teleconsulta Supabase
*Gerado por Nina | 2026-03-18*

## ✅ Tabelas Criadas (16)

| Tabela | Descrição |
|---|---|
| `perfis_usuarios` | Perfis de pacientes, médicos e admins |
| `medicos` | Cadastro completo de médicos |
| `procedimentos` | Procedimentos/especialidades por médico |
| `agenda_medico` | Horários disponíveis por médico |
| `agendamentos` | Consultas agendadas (core do sistema) |
| `agendamento_logs` | Histórico de ações nos agendamentos |
| `avaliacoes` | Avaliações de consultas |
| `reviews` | Reviews públicos de médicos |
| `notifications` | Notificações por usuário |
| `conversations` | Conversas de chat |
| `messages` | Mensagens do chat |
| `clinical_episodes` | Prontuário eletrônico |
| `documents` | Documentos legais e guias |
| `doc_instances` | Instâncias de documentos por paciente |
| `signature_sessions` | Sessões de assinatura digital |
| `medico_integracoes` | Integrações externas por médico |
| `configuracoes_site` | Configurações gerais do sistema |
| `ai_knowledge_base` | Base de conhecimento para chatbot |
| `avatars` | Metadados de avatares/fotos |

## ✅ RLS Configurado

- Todas as tabelas com Row Level Security ativado
- Policies por role: paciente, medico, admin
- Dados médicos isolados por usuário

## ✅ Triggers

- `updated_at` automático em: perfis_usuarios, medicos, agendamentos
- `handle_new_user`: cria perfil automaticamente ao registrar novo usuário via Supabase Auth

## ✅ Funções

- `wipe_system_data()`: limpa dados de teste (admin only)
- `update_updated_at_column()`: atualiza timestamp automaticamente

## ⚠️ Pendências

### Secrets do Backend (configurar no Supabase Dashboard → Edge Functions → Secrets)
- `MEMED_API_KEY` — chave da API Memed
- `MEMED_SECRET_KEY` — secret da Memed
- `MEMED_API_URL` — endpoint da Memed

### Auth (Supabase Dashboard → Authentication)
- [ ] Habilitar providers: Email/Password, Google (opcional)
- [ ] Configurar URL de redirect: `https://www.clickteleconsulta.online`
- [ ] Email templates em português

### Storage (Supabase Dashboard → Storage)
- [ ] Criar bucket `avatars` (público)
- [ ] Criar bucket `documentos` (privado)
- [ ] Criar bucket `prontuarios` (privado)

### Domínio
- [ ] Configurar DNS do `clickteleconsulta.online` para o hosting
- [ ] SSL/HTTPS configurado

## 🚀 Próximos Passos para Produção

1. Configurar Auth no dashboard Supabase
2. Criar buckets de Storage
3. Definir hosting (Vercel, Netlify, VPS?)
4. Configurar variáveis de ambiente no hosting
5. Build e deploy: `npm run build`
6. Testar fluxo completo: registro → agendamento → videochamada
