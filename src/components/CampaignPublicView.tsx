import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, HeartHandshake, QrCode, ShieldCheck } from 'lucide-react';
import { CampanhaPublica } from '../types.ts';
import { formatBRL, formatBRLCompact, formatDateTimeBR } from '../utils/format.ts';

interface CampaignPublicViewProps {
  campanhas: CampanhaPublica[];
  selectedCampaignId: number | null;
  onSelectCampaign: (id: number) => void;
  onProceedToCheckout: (campaign: CampanhaPublica, amount: number) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  serverError: string | null;
}

type PresetOption = 20 | 50 | 'outro';

export const CampaignPublicView: React.FC<CampaignPublicViewProps> = ({
  campanhas,
  selectedCampaignId,
  onSelectCampaign,
  onProceedToCheckout,
  isLoading,
  isSubmitting,
  serverError,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(50);
  const [customValue, setCustomValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({});
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const activeCampaign =
    campanhas.find((c) => c.id_campanha === selectedCampaignId) || campanhas[0] || null;

  useEffect(() => {
    if (selectedPreset === 'outro') {
      customInputRef.current?.focus();
    }
  }, [selectedPreset]);

  const handleSelectPreset = (option: PresetOption) => {
    setSelectedPreset(option);
    setValidationError(null);
  };

  const getChosenAmount = (): number | null => {
    if (selectedPreset === 20) return 20;
    if (selectedPreset === 50) return 50;

    const normalized = customValue.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return Math.round(parsed * 100) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;

    const amount = getChosenAmount();
    if (amount === null || amount <= 0) {
      setValidationError('Informe um valor válido maior que R$ 0,00 para continuar.');
      return;
    }
    if (amount > 100000) {
      setValidationError('Para doações acima de R$ 100.000,00, entre em contato com a O.S.C.');
      return;
    }

    setValidationError(null);
    await onProceedToCheckout(activeCampaign, amount);
  };

  if (isLoading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
          <div className="lg:col-span-6 space-y-5">
            <div className="h-10 bg-slate-200 rounded-lg w-3/4" />
            <div className="h-6 bg-slate-200 rounded w-full" />
            <div className="h-10 bg-slate-200 rounded-xl w-full" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-14 bg-slate-200 rounded-xl" />
              <div className="h-14 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-14 bg-slate-200 rounded-xl" />
          </div>
          <div className="lg:col-span-6 h-80 lg:h-[420px] bg-slate-200 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!activeCampaign) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Nenhuma campanha ativa no momento
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            A equipe da O.S.C Amigos da Mara está preparando a próxima ação solidária. Volte em breve
            ou acesse o painel administrativo para ativar uma campanha.
          </p>
        </div>
      </main>
    );
  }

  const pct = activeCampaign.percentual_atingido;
  const imgBroken = !activeCampaign.imagem_url || imageFailed[activeCampaign.id_campanha];

  return (
    <main className="pb-16">
      {/* Tela 1: Página Pública da Campanha */}
      <section id="campanha" className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12">
        {campanhas.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Campanhas ativas">
            {campanhas.map((campanha) => {
              const isSelected = campanha.id_campanha === activeCampaign.id_campanha;
              return (
                <button
                  key={campanha.id_campanha}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectCampaign(campanha.id_campanha);
                    setValidationError(null);
                  }}
                  className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {campanha.titulo}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Campaign Goal, Progress Bar & Pix Value Selection */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 mb-3">
                <span>O.S.C Amigos da Mara</span>
                <span aria-hidden="true">·</span>
                <span>Pix Direto Sem Taxas</span>
                <span aria-hidden="true">·</span>
                <span>ODS 1</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                {activeCampaign.titulo}
              </h1>

              {activeCampaign.descricao && (
                <p className="mt-3 text-slate-700 text-base leading-relaxed">
                  {activeCampaign.descricao}
                </p>
              )}

              {/* RF03: Graphical Progress Bar (High Contrast >= 4.5:1) */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Progresso da arrecadação
                  </span>
                  <span className="font-mono text-lg font-bold text-sky-800 tabular-nums">
                    {pct}%
                  </span>
                </div>

                <div
                  className="w-full h-7 bg-slate-200 rounded-full overflow-hidden border border-slate-300 relative"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso da campanha ${activeCampaign.titulo}: ${pct}% arrecadado`}
                >
                  <div
                    className="h-full bg-sky-700 transition-transform duration-500 origin-left flex items-center justify-end pr-2.5"
                    style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }}
                  >
                    {pct >= 18 && (
                      <span className="font-mono text-xs font-semibold text-white tabular-nums">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-base">
                  <div>
                    <span className="text-slate-600">Arrecadado: </span>
                    <strong className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatBRLCompact(activeCampaign.valor_arrecadado)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Meta: </span>
                    <strong className="font-mono font-semibold text-slate-800 tabular-nums">
                      {formatBRLCompact(activeCampaign.meta_financeira)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Donation Value Form */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  Escolha o valor para apoiar
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(20)}
                    aria-pressed={selectedPreset === 20}
                    className={`min-h-[54px] px-4 py-3 rounded-xl font-display text-lg font-bold tabular-nums border-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                      selectedPreset === 20
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    R$ 20
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset(50)}
                    aria-pressed={selectedPreset === 50}
                    className={`min-h-[54px] px-4 py-3 rounded-xl font-display text-lg font-bold tabular-nums border-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                      selectedPreset === 50
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    R$ 50
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('outro')}
                  aria-pressed={selectedPreset === 'outro'}
                  className={`mt-3 w-full min-h-[52px] px-4 py-3 rounded-xl font-display text-base font-bold border-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                    selectedPreset === 'outro'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Outro Valor
                </button>

                {selectedPreset === 'outro' && (
                  <div className="mt-3">
                    <label
                      htmlFor="custom-amount-input"
                      className="block text-sm font-semibold text-slate-800 mb-1.5"
                    >
                      Digite o valor em reais (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base font-semibold text-slate-600">
                        R$
                      </span>
                      <input
                        ref={customInputRef}
                        id="custom-amount-input"
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step="0.01"
                        placeholder="Ex: 100,00"
                        value={customValue}
                        onChange={(e) => {
                          setCustomValue(e.target.value);
                          setValidationError(null);
                        }}
                        className="w-full min-h-[50px] pl-12 pr-4 py-2.5 bg-white border-2 border-slate-300 focus:border-sky-700 rounded-xl font-mono text-lg font-semibold text-slate-900 tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {(validationError || serverError) && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm font-medium"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
                  <span>{validationError || serverError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:bg-sky-400 text-white font-display text-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              >
                <span>{isSubmitting ? 'Gerando Pix...' : 'Apoiar Agora'}</span>
                {!isSubmitting && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
              </button>

              <p className="text-xs text-slate-600 text-center">
                Sem cadastro, sem senha e sem taxas: 100% do valor vai direto para a O.S.C Amigos da Mara.
              </p>
            </form>
          </div>

          {/* Right Column: Editorial Campaign Photography */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="relative flex-1 min-h-[260px] lg:min-h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {!imgBroken ? (
                <img
                  src={activeCampaign.imagem_url!}
                  alt={`Ação comunitária da campanha ${activeCampaign.titulo} - O.S.C Amigos da Mara`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImageFailed((prev) => ({ ...prev, [activeCampaign.id_campanha]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-sky-50 via-slate-100 to-emerald-50 flex flex-col items-center justify-center p-8 text-center">
                  <HeartHandshake className="w-14 h-14 text-sky-700 mb-3" aria-hidden="true" />
                  <p className="font-display text-xl font-bold text-slate-900">
                    {activeCampaign.titulo}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">O.S.C Amigos da Mara</p>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-6 text-white">
                <p className="text-xs font-medium text-slate-200">
                  O.S.C Amigos da Mara · Fundadora Deusdália Guedes
                </p>
                <p className="mt-1 font-display text-lg font-semibold leading-snug">
                  Apoio direto às crianças da comunidade com transparência em tempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona (3 concise institutional steps) */}
      <section
        id="como-funciona"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-slate-200"
      >
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Como funciona a doação via Pix direto
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-1">
            Fluxo projetado para smartphone em menos de 1 minuto, sem intermediários.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 mb-4">
              <HeartHandshake className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              01. Escolha o valor
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Selecione R$ 20, R$ 50 ou informe qualquer quantia. Não exigimos criação de conta ou CPF.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 mb-4">
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              02. Copie o código Pix
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Toque em &ldquo;Copiar Código Pix&rdquo; ou aponte a câmera para o QR Code no aplicativo do seu banco.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 mb-4">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              03. Atualização automática
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Assim que o banco confirma o pagamento, a barra de progresso atualiza automaticamente para todos.
            </p>
          </div>
        </div>
      </section>

      {/* RF04: Últimos Apoiadores (Transparência) */}
      <section
        id="apoiadores"
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6 border-t border-slate-200"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Últimos Apoiadores
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Doações confirmadas na campanha {activeCampaign.titulo}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Exibição opcional de nome · privacidade preservada
          </span>
        </div>

        {activeCampaign.apoiadores_recentes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
            Seja a primeira pessoa a apoiar esta campanha hoje.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
            {activeCampaign.apoiadores_recentes.map((apoiador) => (
              <div
                key={apoiador.id_doacao}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {apoiador.nome_doador || 'Apoiador anônimo'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pix confirmado · {formatDateTimeBR(apoiador.updated_at)}
                  </p>
                </div>
                <span className="font-mono text-base font-bold text-emerald-800 tabular-nums shrink-0">
                  {formatBRL(apoiador.valor_doacao)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
