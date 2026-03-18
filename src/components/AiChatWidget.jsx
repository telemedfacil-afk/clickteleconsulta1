import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const INITIAL_MESSAGE = {
  id: 'welcome',
  text: 'Olá! Sou o assistente virtual da Click Teleconsulta. Como posso ajudar você hoje?',
  sender: 'ai',
  timestamp: new Date()
};

// Common Portuguese stop words to ignore during scoring for better context focus
const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'com', 'sem', 'e', 'ou', 'mas', 'que', 'se',
  'eu', 'vc', 'voce', 'você', 'ele', 'ela', 'meu', 'minha',
  'como', 'qual', 'onde', 'quando', 'quem', 'porque', 'pq', 'por que',
  'ola', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'favor', 'por favor'
]);

// Helper to normalize text (remove accents, lowercase)
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .trim();
};

const COURTESY_TRIGGERS = [
  'obrigado', 'obrigada', 'grato', 'grata', 'valeu', 'vlw', 
  'ok', 'blz', 'beleza', 'certo', 'entendi', 'perfeito', 'show', 'joia',
  'tudo bem', 'bom dia', 'boa tarde', 'boa noite'
];

const COURTESY_RESPONSES = [
  'Por nada! Fico à disposição 😊',
  'Disponha! Se precisar de mais alguma coisa, é só chamar.',
  'Qualquer coisa, estou por aqui.',
  'Fico feliz em ajudar!',
  'Conte comigo!',
  'Imagina! Tenha um ótimo dia.'
];

const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch initial knowledge base
  useEffect(() => {
    let isMounted = true;

    const fetchKnowledgeBase = async () => {
      // console.log('🔄 Fetching AI knowledge base...');
      try {
        const { data, error } = await supabase
          .from('ai_knowledge_base')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching AI knowledge base:', error);
          return;
        }

        if (isMounted && data) {
          console.log(`✅ AI Knowledge base loaded: ${data.length} rules found.`);
          setKnowledgeBase(data);
        }
      } catch (err) {
        console.error('❌ Unexpected error fetching knowledge base:', err);
      }
    };

    fetchKnowledgeBase();

    // Set up real-time subscription
    const channel = supabase
      .channel('ai-widget-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_knowledge_base'
        },
        (payload) => {
          console.log('⚡ Realtime update received for AI knowledge base:', payload);
          fetchKnowledgeBase();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  const calculateMatchScore = (userTokens, triggerTokens, triggerPhrase, normalizedUserText) => {
    let score = 0;

    // 1. Exact phrase match bonus (highest priority)
    if (normalizedUserText.includes(triggerPhrase)) {
      score += 50; 
    }

    // 2. Token overlap scoring
    let matchCount = 0;
    const meaningfulTriggerTokens = triggerTokens.filter(t => !STOP_WORDS.has(t));
    
    // If the trigger is only stop words (unlikely but possible), use all tokens
    const tokensToMatch = meaningfulTriggerTokens.length > 0 ? meaningfulTriggerTokens : triggerTokens;

    tokensToMatch.forEach(token => {
      if (userTokens.includes(token)) {
        matchCount++;
        score += 10; // Base score for a word match
      } else {
        // Check for partial matches (e.g., "agend" inside "agendamento")
        const partialMatch = userTokens.some(ut => ut.includes(token) || token.includes(ut));
        if (partialMatch && token.length > 3) {
           score += 3; // Small score for partial match
        }
      }
    });

    // 3. Density/Coverage Bonus: Reward if a high % of the trigger's meaningful words are present
    if (tokensToMatch.length > 0) {
      const coverage = matchCount / tokensToMatch.length;
      score += coverage * 20; // Up to 20 points for 100% coverage
    }

    return score;
  };

  const generateResponse = async (userText) => {
    setIsTyping(true);
    // console.log(`🗣️ User asked: "${userText}"`);
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

    const normalizedUserText = normalizeText(userText);
    const userTokens = normalizedUserText.split(/\s+/);
    
    // --- COURTESY MESSAGE HANDLER ---
    // Detects simple courtesy phrases before checking KB
    // Limits to short messages (<= 4 words) to avoid interrupting legitimate questions
    if (userTokens.length <= 4) {
      const isCourtesy = COURTESY_TRIGGERS.some(trigger => 
        normalizedUserText.includes(trigger)
      );

      if (isCourtesy) {
        const randomResponse = COURTESY_RESPONSES[Math.floor(Math.random() * COURTESY_RESPONSES.length)];
        
        const aiMessage = {
          id: Date.now().toString(),
          text: randomResponse,
          sender: 'ai',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        return; // Stop execution here
      }
    }
    // -------------------------------
    
    let bestMatch = null;
    let highestScore = 0;
    const THRESHOLD_SCORE = 15; // Minimum score to consider a valid match

    // 1. Check Database Rules first with Scoring System
    if (knowledgeBase.length > 0) {
      // Flatten the knowledge base: split comma-separated questions into individual triggers
      const allTriggers = [];
      
      knowledgeBase.forEach(rule => {
        if (!rule.question) return;
        
        // Split by comma to support multiple keywords per rule
        const triggers = rule.question.split(',').map(t => normalizeText(t)).filter(t => t);
        
        triggers.forEach(triggerPhrase => {
          const triggerTokens = triggerPhrase.split(/\s+/);
          allTriggers.push({
            triggerPhrase,
            triggerTokens,
            answer: rule.answer,
            originalId: rule.id
          });
        });
      });

      // Score each trigger against the user input
      allTriggers.forEach(item => {
        const score = calculateMatchScore(userTokens, item.triggerTokens, item.triggerPhrase, normalizedUserText);
        
        // Debug scoring logic
        // if (score > 0) console.log(`Score: ${score} | Trigger: "${item.triggerPhrase}"`);

        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      });
    }

    let responseText = '';

    if (bestMatch && highestScore >= THRESHOLD_SCORE) {
      // console.log(`✅ Best Match Found (Score: ${highestScore}): "${bestMatch.triggerPhrase}"`);
      responseText = bestMatch.answer;
    } else {
      // console.log(`❌ No strong match found (Highest Score: ${highestScore}). Using fallback logic.`);
      
      // 2. Fallback hardcoded logic (Contextual checks)
      // Check if user has specific intents based on key tokens found in query
      const hasToken = (token) => userTokens.includes(token);
      const hasAnyToken = (tokens) => tokens.some(t => userTokens.includes(t) || userTokens.some(ut => ut.includes(t)));

      if (hasAnyToken(['preco', 'valor', 'custa', 'pagamento', 'pagar', 'cartao', 'pix'])) {
        responseText = 'Nossos especialistas definem seus próprios valores, mas a maioria das consultas inicia-se a partir de R$ 80,00. Aceitamos Pix e Cartão de Crédito via Stripe.';
      } else if (hasAnyToken(['agendar', 'marcar', 'horario', 'data', 'disponivel'])) {
        responseText = 'Para agendar, basta navegar até a lista de "Agendamentos" no menu principal, escolher um médico e selecionar o melhor horário para você!';
      } else if (hasAnyToken(['medico', 'doutor', 'especialista', 'cardiologista', 'pediatra'])) {
        responseText = 'Temos diversos especialistas qualificados em nossa plataforma. Você pode filtrar por especialidade na página de busca.';
      } else if (hasAnyToken(['cancelar', 'reembolso', 'desistir'])) {
        responseText = 'Você pode cancelar sua consulta através do painel do paciente. O reembolso é processado automaticamente se o cancelamento ocorrer com 24h de antecedência.';
      } else if (hasAnyToken(['ajuda', 'suporte', 'problema', 'erro'])) {
        responseText = 'Você pode entrar em contato com nosso suporte técnico através da página de "Suporte" no menu superior.';
      } else if (hasAnyToken(['ola', 'oi', 'bom', 'tarde', 'noite'])) {
         responseText = 'Olá! Tudo bem? Estou aqui para tirar suas dúvidas sobre a plataforma Click Teleconsulta. Em que posso ajudar?';
      } else {
        responseText = 'Desculpe, não entendi muito bem sua pergunta. Tente usar palavras-chave mais específicas ou reformular a frase. Estou aprendendo a cada dia!';
      }
    }

    const aiMessage = {
      id: Date.now().toString(),
      text: responseText,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Trigger response generation
    generateResponse(userMessage.text);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto"
          >
            <Card className="w-[350px] sm:w-[380px] h-[500px] shadow-2xl border-primary/20 flex flex-col overflow-hidden bg-white/95 backdrop-blur-sm">
              <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-1">
                      Assistente IA <Sparkles className="w-3 h-3 text-yellow-300" />
                    </CardTitle>
                    <p className="text-xs text-primary-foreground/80 font-normal">Online agora</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="flex-grow overflow-hidden p-0 bg-slate-50 relative">
                <div 
                  ref={scrollRef}
                  className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
                >
                  <div className="text-xs text-center text-muted-foreground my-2 opacity-50">
                    Início da conversa
                  </div>
                  
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex w-full",
                        msg.sender === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap break-words",
                        msg.sender === 'user' 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                      )}>
                        {msg.text}
                        <div className={cn(
                          "text-[10px] mt-1 opacity-70 flex justify-end",
                          msg.sender === 'user' ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start w-full"
                    >
                      <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-3 bg-white border-t shrink-0">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex w-full items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite sua dúvida..."
                    className="flex-grow bg-slate-50 border-slate-200 focus-visible:ring-primary"
                    disabled={isTyping}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!inputValue.trim() || isTyping}
                    className="shrink-0 rounded-full h-10 w-10"
                  >
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "pointer-events-auto h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isOpen 
            ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-7 h-7" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></span>
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default AiChatWidget;