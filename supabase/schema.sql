-- ============================================================
-- CLICK TELECONSULTA — Schema Completo
-- Gerado por Nina | 2026-03-18
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELA: perfis_usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS perfis_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf TEXT UNIQUE,
  data_nasc DATE,
  email TEXT,
  whatsapp TEXT,
  role TEXT NOT NULL DEFAULT 'paciente' CHECK (role IN ('paciente', 'medico', 'admin')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_perfis_usuarios_updated_at
  BEFORE UPDATE ON perfis_usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE perfis_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprio perfil" ON perfis_usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuário atualiza próprio perfil" ON perfis_usuarios
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin vê todos" ON perfis_usuarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Médico vê perfis de pacientes" ON perfis_usuarios
  FOR SELECT USING (
    role = 'paciente' AND
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'medico')
  );

-- ============================================================
-- TABELA: medicos
-- ============================================================
CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  crm TEXT,
  especialidade TEXT,
  bio TEXT,
  preco NUMERIC(10,2),
  image_url TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'inativo', 'suspenso')),
  agenda_padrao JSONB,
  legal_docs JSONB,
  token TEXT,
  withdrawal_payment_method TEXT,
  withdrawal_pix_key TEXT,
  withdrawal_bank_name TEXT,
  withdrawal_bank_agency TEXT,
  withdrawal_bank_account TEXT,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS medicos_user_id_idx ON medicos(user_id);

CREATE TRIGGER trg_medicos_updated_at
  BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprio perfil" ON medicos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprio perfil" ON medicos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Público vê médicos ativos" ON medicos
  FOR SELECT USING (status = 'ativo');

CREATE POLICY "Admin gerencia médicos" ON medicos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABELA: procedimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2),
  duracao_minutos INT DEFAULT 30,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico gerencia próprios procedimentos" ON procedimentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

CREATE POLICY "Público vê procedimentos" ON procedimentos
  FOR SELECT USING (TRUE);

-- ============================================================
-- TABELA: agenda_medico
-- ============================================================
CREATE TABLE IF NOT EXISTS agenda_medico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  horario_inicio TIME,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'bloqueado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_medico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico gerencia própria agenda" ON agenda_medico
  FOR ALL USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

CREATE POLICY "Público vê agenda disponível" ON agenda_medico
  FOR SELECT USING (status = 'disponivel');

-- ============================================================
-- TABELA: agendamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  procedimento_id UUID REFERENCES procedimentos(id),
  data_hora TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'realizado', 'no_show')),
  video_room TEXT,
  preco NUMERIC(10,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agendamentos_medico_idx ON agendamentos(medico_id);
CREATE INDEX IF NOT EXISTS agendamentos_patient_idx ON agendamentos(patient_id);
CREATE INDEX IF NOT EXISTS agendamentos_data_hora_idx ON agendamentos(data_hora);

CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprios agendamentos" ON agendamentos
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Médico vê agendamentos dele" ON agendamentos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

CREATE POLICY "Paciente cria agendamento" ON agendamentos
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Médico atualiza agendamento" ON agendamentos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

CREATE POLICY "Admin gerencia agendamentos" ON agendamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABELA: agendamento_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamento_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  dados JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agendamento_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê logs" ON agendamento_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABELA: avaliacoes (reviews)
-- ============================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê avaliações" ON avaliacoes FOR SELECT USING (TRUE);

CREATE POLICY "Paciente cria avaliação" ON avaliacoes
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ============================================================
-- TABELA: reviews (alias/complemento)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id UUID REFERENCES medicos(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Público vê reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Paciente cria review" ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ============================================================
-- TABELA: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  tipo TEXT DEFAULT 'geral',
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprias notificações" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: conversations (chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id),
  medico_id UUID REFERENCES medicos(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem conversa" ON conversations
  FOR SELECT USING (
    auth.uid() = patient_id OR
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

-- ============================================================
-- TABELA: messages (chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem mensagens" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND (
        c.patient_id = auth.uid() OR
        EXISTS (SELECT 1 FROM medicos WHERE id = c.medico_id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Usuário envia mensagem" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Usuário atualiza própria mensagem" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- ============================================================
-- TABELA: clinical_episodes (prontuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES medicos(id),
  agendamento_id UUID REFERENCES agendamentos(id),
  titulo TEXT,
  descricao TEXT,
  diagnostico TEXT,
  prescricao JSONB,
  anexos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinical_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprio prontuário" ON clinical_episodes
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Médico gerencia episódios" ON clinical_episodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

-- ============================================================
-- TABELA: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  conteudo TEXT,
  tipo TEXT DEFAULT 'geral',
  publico BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia documentos" ON documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Público vê documentos públicos" ON documents
  FOR SELECT USING (publico = TRUE);

-- ============================================================
-- TABELA: doc_instances (assinatura digital)
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id),
  patient_id UUID REFERENCES auth.users(id),
  agendamento_id UUID REFERENCES agendamentos(id),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'rejeitado')),
  dados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doc_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprios docs" ON doc_instances
  FOR SELECT USING (auth.uid() = patient_id);

-- ============================================================
-- TABELA: signature_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS signature_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_instance_id UUID REFERENCES doc_instances(id),
  patient_id UUID REFERENCES auth.users(id),
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE signature_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprias sessões" ON signature_sessions
  FOR SELECT USING (auth.uid() = patient_id);

-- ============================================================
-- TABELA: medico_integracoes
-- ============================================================
CREATE TABLE IF NOT EXISTS medico_integracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  config JSONB,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medico_integracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico gerencia próprias integrações" ON medico_integracoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM medicos WHERE id = medico_id AND user_id = auth.uid())
  );

-- ============================================================
-- TABELA: configuracoes_site
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracoes_site (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT UNIQUE NOT NULL,
  valor JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia configurações" ON configuracoes_site
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Público lê configurações" ON configuracoes_site
  FOR SELECT USING (TRUE);

-- ============================================================
-- TABELA: ai_knowledge_base
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria TEXT,
  pergunta TEXT,
  resposta TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia knowledge base" ON ai_knowledge_base
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Público lê knowledge base" ON ai_knowledge_base
  FOR SELECT USING (ativo = TRUE);

-- ============================================================
-- TABELA: avatars (storage metadata)
-- ============================================================
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprio avatar" ON avatars
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNÇÃO: wipe_system_data (admin only — usar com cuidado!)
-- ============================================================
CREATE OR REPLACE FUNCTION wipe_system_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só admin pode chamar
  IF NOT EXISTS (
    SELECT 1 FROM perfis_usuarios WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  DELETE FROM agendamento_logs;
  DELETE FROM agendamentos;
  DELETE FROM agenda_medico;
  DELETE FROM notifications;
  DELETE FROM messages;
  DELETE FROM conversations;
  DELETE FROM clinical_episodes;
END;
$$;

-- ============================================================
-- TRIGGER: criar perfil ao registrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis_usuarios (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'paciente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
