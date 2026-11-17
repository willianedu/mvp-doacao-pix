import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { ApiService } from '../services/api.ts';
import { AdminDashboardData } from '../types.ts';
import { formatBRL, formatDateTimeBR } from '../utils/format.ts';

interface AdminDashboardViewProps {
  refreshSignal: number;
  onAuthExpired: () => void;
  onCampaignChanged: () => void;
}

type AdminTab = 'doacoes' | 'campanhas';
type StatusFilter = 'todas' | 'aprovado' | 'pendente' | 'expirado';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  refreshSignal,
  onAuthExpired,
  onCampaignChanged,
}) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('doacoes');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // New campaign state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newGoal, setNewGoal] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [processingDonationId, setProcessingDonationId] = useState<number | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const res = await ApiService.getAdminDashboard({
          status: statusFilter,
          search: searchTerm,
        });
        setData(res);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        if (status === 401 || status === 403) {
          onAuthExpired();
          return;
        }
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Erro ao carregar dados do painel.',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, searchTerm, onAuthExpired]
  );

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard, refreshSignal]);

  const handleFallbackVerify = async (idDoacao: number) => {
    setProcessingDonationId(idDoacao);
    setFeedback(null);
    try {
      const res = await ApiService.verifyDonationFallback(idDoacao);
      setFeedback({ type: 'success', text: res.message });
      await loadDashboard(true);
      onCampaignChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao verificar pagamento Pix.',
      });
    } finally {
      setProcessingDonationId(null);
    }
  };

  const handleExpireDonation = async (idDoacao: number) => {
    setProcessingDonationId(idDoacao);
    setFeedback(null);
    try {
      await ApiService.expireDonation(idDoacao);
      setFeedback({ type: 'success', text: 'Doação marcada como expirada.' });
      await loadDashboard(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar doação.',
      });
    } finally {
      setProcessingDonationId(null);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedGoal = Number(newGoal.replace(',', '.'));
    if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      setFeedback({ type: 'error', text: 'A meta financeira deve ser maior que zero.' });
      return;
    }

    setIsCreating(true);
    try {
      await ApiService.createCampaign({
        titulo: newTitle,
        descricao: newDesc,
        meta_financeira: parsedGoal,
      });
      setNewTitle('');
      setNewDesc('');
      setNewGoal('');
      setShowCreateForm(false);
      setFeedback({ type: 'success', text: 'Nova campanha criada e ativada com sucesso.' });
      await loadDashboard(true);
      onCampaignChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao criar campanha.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCampaignActive = async (idCampanha: number, currentActive: boolean) => {
    setFeedback(null);
    try {
      await ApiService.updateCampaign(idCampanha, { status_ativa: !currentActive });
      setFeedback({
        type: 'success',
        text: !currentActive ? 'Campanha ativada no portal público.' : 'Campanha pausada.',
      });
      await loadDashboard(true);
      onCampaignChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao alterar status da campanha.',
      });
    }
  };

  const handleDeleteCampaign = async (idCampanha: number) => {
    setFeedback(null);
    try {
      await ApiService.deleteCampaign(idCampanha);
      setConfirmDeleteId(null);
      setFeedback({ type: 'success', text: 'Campanha removida com sucesso.' });
      await loadDashboard(true);
      onCampaignChanged();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao remover campanha.',
      });
    }
  };

  if (isLoading || !data) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Real-Time Notice + Fallback Manual Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Painel Administrativo · {data.admin.nome}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Gestão de Doações e Campanhas
          </h1>
          <p className="text-xs text-emerald-800 font-medium mt-1">
            Atualizado em tempo real via webhook Pix
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(false)}
          disabled={isRefreshing}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-sm font-semibold text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section aria-label="Indicadores de resultado" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Arrecadado</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatBRL(data.metricas.total_arrecadado)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Pagamentos Aprovados</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
            {data.metricas.total_aprovadas}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Pix Pendentes</p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-800 tabular-nums">
            {data.metricas.total_pendentes}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Taxa de Conversão</p>
          <p className="mt-2 font-mono text-2xl font-bold text-sky-800 tabular-nums">
            {data.metricas.taxa_conversao}%
          </p>
        </div>
      </section>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl"
          role="tablist"
          aria-label="Seções administrativas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'doacoes'}
            onClick={() => setActiveTab('doacoes')}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'doacoes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Últimas Doações
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'campanhas'}
            onClick={() => setActiveTab('campanhas')}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'campanhas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Campanhas
          </button>
        </div>

        {activeTab === 'campanhas' && (
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nova Campanha</span>
          </button>
        )}
      </div>

      {/* Tab 1: Últimas Doações */}
      {activeTab === 'doacoes' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(
                [
                  ['todas', 'Todas'],
                  ['aprovado', 'Aprovado'],
                  ['pendente', 'Pendente'],
                  ['expirado', 'Expirado'],
                ] as Array<[StatusFilter, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Buscar por nome do doador ou código da transação"
                placeholder="Buscar doador ou TXID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-sky-700 rounded-xl text-sm text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {data.doacoes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Nenhuma doação encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Doador</th>
                    <th className="py-3.5 px-4">Campanha</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {data.doacoes.map((doacao) => (
                    <tr key={doacao.id_doacao} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        #{doacao.id_doacao}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[220px] break-words">
                        {doacao.nome_doador || 'Apoiador anônimo'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{doacao.campanha_titulo}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatBRL(doacao.valor_doacao)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateTimeBR(doacao.updated_at)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {doacao.status_pagamento === 'aprovado' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Aprovado</span>
                          </span>
                        )}
                        {doacao.status_pagamento === 'pendente' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Pendente</span>
                          </span>
                        )}
                        {doacao.status_pagamento === 'expirado' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Expirado</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {doacao.status_pagamento === 'pendente' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={processingDonationId === doacao.id_doacao}
                              onClick={() => handleFallbackVerify(doacao.id_doacao)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold cursor-pointer"
                            >
                              Verificar Pix
                            </button>
                            <button
                              type="button"
                              disabled={processingDonationId === doacao.id_doacao}
                              onClick={() => handleExpireDonation(doacao.id_doacao)}
                              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                            >
                              Expirar
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">{doacao.txid}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Gestão de Campanhas */}
      {activeTab === 'campanhas' && (
        <section className="space-y-4">
          {showCreateForm && (
            <form
              onSubmit={handleCreateCampaign}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-slate-900">
                Cadastrar Nova Campanha
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="new-campaign-title"
                    className="block text-sm font-semibold text-slate-900 mb-1"
                  >
                    Título único da campanha
                  </label>
                  <input
                    id="new-campaign-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Campanha de Inverno 2026"
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-campaign-goal"
                    className="block text-sm font-semibold text-slate-900 mb-1"
                  >
                    Meta financeira (R$)
                  </label>
                  <input
                    id="new-campaign-goal"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:border-sky-700 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="new-campaign-desc"
                  className="block text-sm font-semibold text-slate-900 mb-1"
                >
                  Descrição curta (opcional)
                </label>
                <textarea
                  id="new-campaign-desc"
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explique o objetivo da arrecadação para os doadores."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-700 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold cursor-pointer"
                >
                  {isCreating ? 'Salvando...' : 'Salvar Campanha'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
            {data.campanhas.map((camp) => (
              <div
                key={camp.id_campanha}
                className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="font-mono">ID #{camp.id_campanha}</span>
                    <span aria-hidden="true">·</span>
                    <span className={camp.status_ativa ? 'text-emerald-800 font-semibold' : 'text-slate-600'}>
                      {camp.status_ativa ? 'Ativa no portal público' : 'Pausada'}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{camp.titulo}</h3>
                  {camp.descricao && (
                    <p className="text-sm text-slate-600 line-clamp-2">{camp.descricao}</p>
                  )}

                  <div className="pt-2 max-w-md">
                    <div className="flex justify-between text-xs font-mono text-slate-700 mb-1 tabular-nums">
                      <span>Arrecadado: {formatBRL(camp.valor_arrecadado)}</span>
                      <span>
                        Meta: {formatBRL(camp.meta_financeira)} ({camp.percentual_atingido}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-700"
                        style={{ width: `${camp.percentual_atingido}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCampaignActive(camp.id_campanha, camp.status_ativa)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-sm font-semibold text-slate-800 cursor-pointer"
                  >
                    {camp.status_ativa ? 'Pausar' : 'Ativar'}
                  </button>

                  {confirmDeleteId === camp.id_campanha ? (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(camp.id_campanha)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-semibold cursor-pointer"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(camp.id_campanha)}
                      aria-label={`Excluir campanha ${camp.titulo}`}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-300 text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
