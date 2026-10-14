import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, CheckCircle, AlertTriangle, Clock, RefreshCw, Send, Phone, UserCheck, Pause, Play, ShieldAlert, Key, Sparkles, ExternalLink } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AgentLead {
  id: string;
  phone: string;
  name: string;
  size?: string;
  status: 'novo' | 'em_atendimento' | 'aguardando_pagamento' | 'pago' | 'aguardando_humano' | 'pausado';
  address?: string;
  total_amount?: number;
  is_ai_paused: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AgentMessage {
  id: string;
  lead_phone: string;
  sender: 'cliente' | 'agente_ia' | 'humano';
  content: string;
  created_at: string;
}

interface AgentSettings {
  is_active: boolean;
  test_mode: boolean;
  whitelist_phones: string[];
  pix_key: string;
  combo_price: number;
}

export const AgentDashboard: React.FC = () => {
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [settings, setSettings] = useState<AgentSettings>({
    is_active: true,
    test_mode: true,
    whitelist_phones: ['553197584189', '558781563664'],
    pix_key: '',
    combo_price: 200.00
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [selectedLead, setSelectedLead] = useState<AgentLead | null>(null);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newWhitelistPhone, setNewWhitelistPhone] = useState('');

  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Carregar configurações
      const { data: setts } = await supabase.from('caca_agent_settings').select('*').eq('id', 'default').single();
      if (setts) {
        setSettings({
          is_active: setts.is_active ?? true,
          test_mode: setts.test_mode ?? true,
          whitelist_phones: setts.whitelist_phones || [],
          pix_key: setts.pix_key || '',
          combo_price: Number(setts.combo_price || 200.00)
        });
      }

      // 2. Carregar leads
      const { data: leadsData } = await supabase
        .from('caca_agent_leads')
        .select('*')
        .order('updated_at', { ascending: false });
      
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados do Agente IA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Atualização em tempo real a cada 10 segundos
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleActive = async () => {
    if (!supabase) return;
    const newVal = !settings.is_active;
    setSettings(prev => ({ ...prev, is_active: newVal }));
    await supabase.from('caca_agent_settings').update({ is_active: newVal, updated_at: new Date().toISOString() }).eq('id', 'default');
    showToast(newVal ? '🤖 Agente IA ativado!' : '⏸️ Agente IA pausado globalmente.');
  };

  const handleToggleTestMode = async () => {
    if (!supabase) return;
    const newVal = !settings.test_mode;
    setSettings(prev => ({ ...prev, test_mode: newVal }));
    await supabase.from('caca_agent_settings').update({ test_mode: newVal, updated_at: new Date().toISOString() }).eq('id', 'default');
    showToast(newVal ? '🛡️ Modo de Teste ATIVADO (Responde apenas para a Whitelist)' : '🚨 Modo Produção ATIVADO (Responde todos os leads)');
  };

  const handleAddWhitelistPhone = async () => {
    if (!newWhitelistPhone.trim() || !supabase) return;
    const clean = newWhitelistPhone.replace(/\D/g, '');
    if (!clean) return;
    const updated = Array.from(new Set([...settings.whitelist_phones, clean]));
    setSettings(prev => ({ ...prev, whitelist_phones: updated }));
    setNewWhitelistPhone('');
    await supabase.from('caca_agent_settings').update({ whitelist_phones: updated, updated_at: new Date().toISOString() }).eq('id', 'default');
    showToast(`Número ${clean} adicionado à Whitelist de teste!`);
  };

  const handleRemoveWhitelistPhone = async (phone: string) => {
    if (!supabase) return;
    const updated = settings.whitelist_phones.filter(p => p !== phone);
    setSettings(prev => ({ ...prev, whitelist_phones: updated }));
    await supabase.from('caca_agent_settings').update({ whitelist_phones: updated, updated_at: new Date().toISOString() }).eq('id', 'default');
    showToast(`Número ${phone} removido da Whitelist.`);
  };

  const handleSavePixAndPrice = async () => {
    if (!supabase) return;
    setSavingSettings(true);
    await supabase.from('caca_agent_settings').update({
      pix_key: settings.pix_key,
      combo_price: settings.combo_price,
      updated_at: new Date().toISOString()
    }).eq('id', 'default');
    setSavingSettings(false);
    showToast('Configurações de Pix e Preço salvas com sucesso!');
  };

  const handleToggleLeadPause = async (lead: AgentLead) => {
    if (!supabase) return;
    const newVal = !lead.is_ai_paused;
    const newStatus = newVal ? 'pausado' : 'em_atendimento';
    await supabase.from('caca_agent_leads').update({
      is_ai_paused: newVal,
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id);

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, is_ai_paused: newVal, status: newStatus } : l));
    if (selectedLead?.id === lead.id) {
      setSelectedLead(prev => prev ? { ...prev, is_ai_paused: newVal, status: newStatus } : null);
    }
    showToast(newVal ? '👤 IA pausada neste contato. Você assumiu o atendimento!' : '🤖 IA reativada para este contato!');
  };

  const handleMarkAsPaid = async (lead: AgentLead) => {
    if (!supabase) return;
    await supabase.from('caca_agent_leads').update({
      status: 'pago',
      updated_at: new Date().toISOString()
    }).eq('id', lead.id);

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'pago' } : l));
    if (selectedLead?.id === lead.id) {
      setSelectedLead(prev => prev ? { ...prev, status: 'pago' } : null);
    }
    showToast(`🎉 Pagamento do lead ${lead.phone} marcado como CONFIRMADO!`);
  };

  const handleOpenChat = async (lead: AgentLead) => {
    setSelectedLead(lead);
    if (!supabase) return;
    setLoadingChat(true);
    try {
      const { data } = await supabase
        .from('caca_agent_messages')
        .select('*')
        .eq('lead_phone', lead.phone)
        .order('created_at', { ascending: true });
      setChatMessages(data || []);
    } catch (e) {
      console.error('Erro ao buscar chat:', e);
    } finally {
      setLoadingChat(false);
    }
  };

  // Métricas calculadas
  const totalLeads = leads.length;
  const aguardandoHumano = leads.filter(l => l.status === 'aguardando_humano').length;
  const vendasFechadas = leads.filter(l => l.status === 'pago').length;
  const emAtendimento = leads.filter(l => l.status === 'em_atendimento' || l.status === 'novo').length;
  const aguardandoPix = leads.filter(l => l.status === 'aguardando_pagamento').length;

  const filteredLeads = leads.filter(l => {
    if (filterStatus === 'todos') return true;
    if (filterStatus === 'aguardando_humano') return l.status === 'aguardando_humano';
    if (filterStatus === 'pago') return l.status === 'pago';
    if (filterStatus === 'aguardando_pagamento') return l.status === 'aguardando_pagamento';
    if (filterStatus === 'em_atendimento') return l.status === 'em_atendimento' || l.status === 'novo';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1329] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-[#D4AF37]/50 text-sm animate-bounce">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header com Status da Instância UazAPI */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white shadow-md">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0A1329]">Agente IA Cacá (WhatsApp)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                UazAPI Conectada
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Instância: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">Sandra Dias IA (6c9e...236b)</code>
            </p>
          </div>
        </div>

        {/* Toggles de Segurança */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleToggleTestMode}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              settings.test_mode
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${settings.test_mode ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>{settings.test_mode ? '🛡️ Modo Teste: ATIVADO (Só Whitelist)' : '🚨 Modo Produção: ABERTO'}</span>
          </button>

          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-white shadow-sm ${
              settings.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {settings.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{settings.is_active ? 'Agente Ligado' : 'Agente Pausado'}</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Total de Leads</span>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-[#0A1329]">{totalLeads}</div>
          <span className="text-[10px] text-gray-400">conversas registradas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Vendas Pagas</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{vendasFechadas}</div>
          <span className="text-[10px] text-emerald-500 font-bold">R$ {(vendasFechadas * settings.combo_price).toFixed(2)}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">Aguardando Humano</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />
          </div>
          <div className="text-2xl font-black text-amber-600">{aguardandoHumano}</div>
          <span className="text-[10px] text-amber-600">Cartão / Dúvidas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Aguardando Pix</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{aguardandoPix}</div>
          <span className="text-[10px] text-gray-400">chave pix enviada</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Em Atendimento</span>
            <Bot className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{emAtendimento}</div>
          <span className="text-[10px] text-gray-400">escolhendo peças</span>
        </div>
      </div>

      {/* Configurações Rápidas: Chave Pix, Preço do Combo e Whitelist */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-[#0A1329] mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-[#D4AF37]" />
            Configuração da Oferta enviada pela IA
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Valor do Combo (R$)</label>
              <input
                type="number"
                value={settings.combo_price}
                onChange={e => setSettings(s => ({ ...s, combo_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-[#0A1329] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Chave Pix da Loja</label>
              <input
                type="text"
                placeholder="CPF / CNPJ / Telefone / Email"
                value={settings.pix_key}
                onChange={e => setSettings(s => ({ ...s, pix_key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-[#0A1329] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
          <button
            onClick={handleSavePixAndPrice}
            disabled={savingSettings}
            className="px-4 py-2 bg-[#0A1329] text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {savingSettings ? 'Salvando...' : 'Salvar Oferta & Pix'}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#0A1329] mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Whitelist de Teste (Números autorizados no Modo Teste)
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="DDD + Número (ex: 5587999998888)"
              value={newWhitelistPhone}
              onChange={e => setNewWhitelistPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={handleAddWhitelistPhone}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Adicionar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {settings.whitelist_phones.map(phone => (
              <span key={phone} className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-[11px] flex items-center gap-1 font-mono">
                {phone}
                <button onClick={() => handleRemoveWhitelistPhone(phone)} className="hover:text-rose-600 ml-1">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Conversas e Atendimentos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filtros de Status */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-600">Filtrar:</span>
            {[
              { id: 'todos', label: 'Todos os Leads' },
              { id: 'aguardando_humano', label: '🚨 Aguardando Humano' },
              { id: 'aguardando_pagamento', label: '💳 Aguardando Pix' },
              { id: 'pago', label: '✅ Pagos' },
              { id: 'em_atendimento', label: '💬 Em Atendimento' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-[#0A1329] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{filteredLeads.length} de {leads.length} conversas</span>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Lead / Cliente</th>
                <th className="py-3 px-4">Tamanho</th>
                <th className="py-3 px-4">Status Atual</th>
                <th className="py-3 px-4">Controle da IA</th>
                <th className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Nenhum lead encontrado neste filtro. Quando novos clientes chamarem no WhatsApp, eles aparecerão aqui em tempo real! 💬✨
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{lead.name || 'Cliente'}</div>
                      <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {lead.phone}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.size ? (
                        <span className="px-2 py-0.5 rounded-md font-black text-xs bg-purple-100 text-purple-800">
                          {lead.size}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Não informado</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.status === 'aguardando_humano' && (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3" />
                          Aguardando Você (Cartão/Link)
                        </span>
                      )}
                      {lead.status === 'pago' && (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3" />
                          Pago Confirmado
                        </span>
                      )}
                      {lead.status === 'aguardando_pagamento' && (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-indigo-100 text-indigo-800 flex items-center gap-1 w-max">
                          <Clock className="w-3 h-3" />
                          Chave Pix Enviada
                        </span>
                      )}
                      {(lead.status === 'em_atendimento' || lead.status === 'novo') && (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-blue-100 text-blue-800 flex items-center gap-1 w-max">
                          <Bot className="w-3 h-3" />
                          Em Atendimento
                        </span>
                      )}
                      {lead.status === 'pausado' && (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-gray-200 text-gray-700 flex items-center gap-1 w-max">
                          <UserCheck className="w-3 h-3" />
                          Humano Assumiu
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleLeadPause(lead)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          lead.is_ai_paused
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {lead.is_ai_paused ? <Play className="w-3 h-3 text-purple-600" /> : <Pause className="w-3 h-3 text-gray-500" />}
                        <span>{lead.is_ai_paused ? 'Reativar IA' : 'Assumir Atendimento'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenChat(lead)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Ver Chat
                        </button>

                        {lead.status !== 'pago' && (
                          <button
                            onClick={() => handleMarkAsPaid(lead)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Marcar como Pago"
                          >
                            ✓ Pago
                          </button>
                        )}

                        <a
                          href={`https://wa.me/${lead.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                          title="Abrir no WhatsApp Web"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visualizador de Conversa */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header do Chat */}
            <div className="p-4 bg-[#0A1329] text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <span>{selectedLead.name || 'Cliente'}</span>
                  {selectedLead.size && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#D4AF37] text-[#0A1329]">
                      Tam {selectedLead.size}
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-300 font-mono">{selectedLead.phone}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-gray-50">
              {loadingChat ? (
                <div className="py-12 text-center text-gray-400">Carregando histórico...</div>
              ) : chatMessages.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">Nenhuma mensagem salva para este lead ainda.</div>
              ) : (
                chatMessages.map(m => {
                  const isAgent = m.sender === 'agente_ia';
                  const isHuman = m.sender === 'humano';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent || isHuman ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                          isAgent
                            ? 'bg-[#0A1329] text-white rounded-tr-xs'
                            : isHuman
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                        }`}
                      >
                        <div className="text-[9px] opacity-75 font-semibold mb-0.5">
                          {isAgent ? '🤖 Cacá (IA)' : isHuman ? '👤 Você (Humano)' : '💬 Cliente'}
                        </div>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-0.5 px-1 font-mono">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé do Chat */}
            <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleToggleLeadPause(selectedLead)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedLead.is_ai_paused
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedLead.is_ai_paused ? '▶️ Reativar IA' : '⏸️ Assumir Atendimento'}
              </button>

              <a
                href={`https://wa.me/${selectedLead.phone}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                Continuar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
