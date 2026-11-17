import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { ApiService } from '../services/api.ts';
import { PixCheckoutResponse } from '../types.ts';
import { formatBRL } from '../utils/format.ts';

interface CheckoutPixViewProps {
  checkout: PixCheckoutResponse;
  onBack: () => void;
  onStatusApproved: () => void;
}

export const CheckoutPixView: React.FC<CheckoutPixViewProps> = ({
  checkout,
  onBack,
  onStatusApproved,
}) => {
  const [donorName, setDonorName] = useState<string>(checkout.nome_doador || '');
  const [savedNameNotice, setSavedNameNotice] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState(checkout.status_pagamento);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Persist optional donor name safely without requiring login or sensitive PII (RNF02)
  const syncDonorNameIfNeeded = async (value: string) => {
    try {
      await ApiService.updateDonationName(checkout.id_doacao, value);
      if (value.trim().length > 0) {
        setSavedNameNotice(true);
        setTimeout(() => setSavedNameNotice(false), 2500);
      }
    } catch {
      // Non-blocking for Pix copy flow
    }
  };

  // Poll status while pending so confirmation reflects immediately even without SSE
  useEffect(() => {
    if (status === 'aprovado') return;
    const interval = setInterval(async () => {
      try {
        const res = await ApiService.getDonationStatus(checkout.id_doacao);
        if (res.status_pagamento === 'aprovado') {
          setStatus('aprovado');
          onStatusApproved();
        }
      } catch {
        // Silent retry
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [checkout.id_doacao, status, onStatusApproved]);

  const handleCopyPix = async () => {
    setActionError(null);
    await syncDonorNameIfNeeded(donorName);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(checkout.codigo_pix_gerado);
      } else {
        const input = document.getElementById('pix-copia-cola-input') as HTMLInputElement | null;
        if (input) {
          input.select();
          document.execCommand('copy');
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 5000);
    } catch {
      setActionError('Não foi possível copiar automaticamente. Selecione o código acima.');
    }
  };

  const handleSimulateBankPayment = async () => {
    setIsSimulating(true);
    setActionError(null);
    try {
      await syncDonorNameIfNeeded(donorName);
      const resp = await ApiService.simulateWebhookApproval({
        id_doacao: checkout.id_doacao,
        txid: checkout.txid,
      });
      if (resp.status_pagamento === 'aprovado') {
        setStatus('aprovado');
        onStatusApproved();
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Erro ao confirmar pagamento em homologação.'
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] inline-flex items-center gap-2 px-3 py-2 -ml-3 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Voltar para a campanha</span>
      </button>

      <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        {/* Header confirming donation intention */}
        <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Campanha · {checkout.campanha_titulo}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              Sua doação: {formatBRL(checkout.valor_doacao)}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Recebedor direto</p>
            <p className="text-sm font-semibold text-slate-900">O.S.C Amigos da Mara</p>
          </div>
        </div>

        {/* Status Banner (Icon + Text, never hue-only) */}
        <div className="mt-5">
          {status === 'aprovado' ? (
            <div
              role="status"
              className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-600 text-emerald-950"
            >
              <CheckCircle2
                className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-display font-bold text-base">
                  Pagamento aprovado! Obrigado pelo apoio.
                </p>
                <p className="text-sm text-emerald-900 mt-0.5">
                  Sua contribuição já foi contabilizada na barra de metas da campanha.
                </p>
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950"
            >
              <Clock className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">
                  Aguardando pagamento no aplicativo do seu banco
                </p>
                <p className="text-xs text-sky-900 mt-0.5">
                  Assim que você concluir o Pix, a confirmação aparecerá automaticamente no painel.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Optional Donor Name Input (Data Minimization RNF02: no CPF, email, phone) */}
        <div className="mt-6">
          <label
            htmlFor="donor-name-input"
            className="block text-sm font-semibold text-slate-900"
          >
            Nome ou Apelido (opcional)
          </label>
          <input
            id="donor-name-input"
            type="text"
            maxLength={80}
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            onBlur={() => syncDonorNameIfNeeded(donorName)}
            placeholder="Ex: Maria Silva"
            className="mt-1.5 w-full min-h-[48px] px-4 py-2.5 bg-white border border-slate-300 focus:border-sky-700 rounded-xl text-base text-slate-900 focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>Deixe em branco para doar anonimamente.</span>
            {savedNameNotice && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Nome salvo
              </span>
            )}
          </div>
        </div>

        {/* QR Code & Read-Only Copia e Cola */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <img
              src={checkout.qr_code_data_url}
              alt={`QR Code Pix no valor de ${formatBRL(checkout.valor_doacao)} para O.S.C Amigos da Mara`}
              className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2 rounded-xl border border-slate-200"
            />
            <p className="mt-2.5 text-xs font-medium text-slate-600 text-center">
              Escaneie no app do banco ou use o botão abaixo
            </p>
          </div>

          <div className="md:col-span-7 space-y-4">
            <div>
              <label
                htmlFor="pix-copia-cola-input"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Código Pix Copia e Cola
              </label>
              <input
                id="pix-copia-cola-input"
                type="text"
                readOnly
                value={checkout.codigo_pix_gerado}
                aria-readonly="true"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 select-all focus:outline-none focus:border-sky-700"
              />
            </div>

            {/* Primary Accessible Copy Button (Icon + Text, >= 44x44px) */}
            <button
              type="button"
              onClick={handleCopyPix}
              className="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-white font-display text-lg font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              {copied ? (
                <>
                  <Check className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span>Código copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span>Copiar Código Pix</span>
                </>
              )}
            </button>

            {copied && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-600 text-emerald-950 text-sm font-semibold"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Código copiado! Agora abra o aplicativo do seu banco e escolha Pix Copia e Cola.</span>
              </div>
            )}

            {actionError && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {actionError}
              </p>
            )}

            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <span>
                Identificador da transação: <span className="font-mono">{checkout.txid}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Staging / Validation Webhook Trigger */}
        {status !== 'aprovado' && (
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Validação em Ambiente de Homologação
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Simule o recebimento do webhook bancário para atualizar a barra de metas e o painel administrativo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimulateBankPayment}
              disabled={isSimulating}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700"
            >
              {isSimulating ? 'Confirmando...' : 'Simular Pagamento Pix'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
