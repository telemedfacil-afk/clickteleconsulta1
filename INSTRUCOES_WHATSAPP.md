# Instruções para Configuração do WhatsApp Automatizado

## 1. Configuração do Cron Job (Hostinger ou Similar)

Para que os lembretes automáticos funcionem, você precisa configurar uma tarefa agendada (Cron Job) que chame a API de lembretes a cada minuto.

**URL do Endpoint:**
`https://SEU_DOMINIO/functions/v1/whatsapp-reminders?secret=clickteleconsulta_whatsapp_2026_x9A7`

**Método:**
`POST`

**Configuração no Painel Hostinger (Cron Jobs):**

1.  Acesse o painel da Hostinger -> Avançado -> Cron Jobs.
2.  Em "Tipo", selecione "Personalizado" ou "PHP" (se for chamar via script, mas aqui usaremos `curl` ou `wget`).
3.  **Comando Sugerido:**