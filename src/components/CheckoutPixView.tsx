import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ShieldCheck,
  X,
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
  const [showToast, setShowToast] = useState<boolean>(false);
  const [status, setStatus] = useState(checkout.status_pagamento);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const copyButtonRef = useRef<HTMLButtonElement | null>(null);
  const copyInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const donorNameRef = useRef<string>(donorName);
  donorNameRef.current = donorName;

  // Persist optional donor name safely without requiring login or sensitive PII (RNF02)
  const syncDonorNameIfNeeded = useCallback(
    async (value: string) => {
      try {
        await ApiService.updateDonationName(checkout.id_doacao, value);
        if (value.trim().length > 0) {
          setSavedNameNotice(true);
          setTimeout(() => setSavedNameNotice(false), 2500);
        }
      } catch {
        // Non-blocking for Pix copy flow
      }
    },
    [checkout.id_doacao]
  );

  const triggerSuccessToast = useCallback(() => {
    setCopied(true);
    setShowToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setCopied(false);
      setShowToast(false);
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setShowToast(false);
  }, []);

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

  // Native JavaScript Event Listener coupled to navigator.clipboard.writeText()
  useEffect(() => {
    const buttonEl = copyButtonRef.current;
    if (!buttonEl) return;

    const handleNativeCopyEvent = async () => {
      setActionError(null);
      // Save optional donor name asynchronously so user-gesture clipboard access stays immediate
      void syncDonorNameIfNeeded(donorNameRef.current);

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(checkout.codigo_pix_gerado);
        } else {
          const input = copyInputRef.current;
          if (!input) {
            throw new Error('Campo Pix indisponível.');
          }
          input.focus();
          input.select();
          input.setSelectionRange(0, input.value.length);
          const copiedLegacy = document.execCommand('copy');
          if (!copiedLegacy) {
            throw new Error('Falha ao copiar código.');
          }
        }
        triggerSuccessToast();
      } catch {
        try {
          const input = copyInputRef.current;
          if (input) {
            input.focus();
            input.select();
            input.setSelectionRange(0, input.value.length);
            if (document.execCommand('copy')) {
              triggerSuccessToast();
              return;
            }
          }
        } catch {
          // Fall through to accessible error feedback
        }
        setActionError('Não foi possível copiar automaticamente. Selecione o código acima.');
      }
    };

    buttonEl.addEventListener('click', handleNativeCopyEvent);
    return () => {
      buttonEl.removeEventListener('click', handleNativeCopyEvent);
    };
  }, [checkout.codigo_pix_gerado, syncDonorNameIfNeeded, triggerSuccessToast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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
        className="min-h-[44px] inline-flex items-center gap-2 px-3 py-2 -ml-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Voltar para a campanha</span>
      </button>

      <section className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
        {/* Header confirming donation intention */}
        <div className="pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Campanha · {checkout.campanha_titulo}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              Sua doação: {formatBRL(checkout.valor_doacao)}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Recebedor direto</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">O.S.C Amigos da Mara</p>
          </div>
        </div>

        {/* Status Banner (Icon + Text, never hue-only) */}
        <div className="mt-5">
          {status === 'aprovado' ? (
            <div
              role="status"
              className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-600 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100"
            >
              <CheckCircle2
                className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-display font-bold text-base">
                  Pagamento aprovado! Obrigado pelo apoio.
                </p>
                <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-0.5">
                  Sua contribuição já foi contabilizada na barra de metas da campanha.
                </p>
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100"
            >
              <Clock className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">
                  Aguardando pagamento no aplicativo do seu banco
                </p>
                <p className="text-xs text-sky-900 dark:text-sky-200 mt-0.5">
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
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
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
            className="mt-1.5 w-full min-h-[48px] px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-sky-700 dark:focus:border-sky-500 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Deixe em branco para doar anonimamente.</span>
            {savedNameNotice && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Nome salvo
              </span>
            )}
          </div>
        </div>

        {/* QR Code & Read-Only Copia e Cola */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <img
              src={checkout.qr_code_data_url}
              alt={`QR Code Pix no valor de ${formatBRL(checkout.valor_doacao)} para O.S.C Amigos da Mara`}
              className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2 rounded-xl border border-slate-200"
            />
            <p className="mt-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 text-center">
              Escaneie no app do banco ou use o botão abaixo
            </p>
          </div>

          <div className="md:col-span-7 space-y-4">
            <div>
              <label
                htmlFor="pix-copia-cola-input"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Código Pix Copia e Cola
              </label>
              <input
                ref={copyInputRef}
                id="pix-copia-cola-input"
                type="text"
                readOnly
                value={checkout.codigo_pix_gerado}
                aria-readonly="true"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 select-all focus:outline-none focus:border-sky-700 dark:focus:border-sky-500"
              />
            </div>

            {/* Primary Accessible Copy Button (Bootstrap 5 utilities + High Contrast + Native EventListener) */}
            <button
              ref={copyButtonRef}
              id="btn-copiar-codigo-pix"
              type="button"
              className={`btn btn-lg btn-pix-contrast w-full font-display fw-bolder fs-5 text-white d-flex align-items-center justify-content-center gap-2.5 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                copied ? 'is-copied' : ''
              }`}
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
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-600 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-sm font-semibold"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Código copiado! Agora abra o aplicativo do seu banco e escolha Pix Copia e Cola.</span>
              </div>
            )}

            {actionError && (
              <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                {actionError}
              </p>
            )}

            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" aria-hidden="true" />
              <span>
                Identificador da transação: <span className="font-mono">{checkout.txid}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Staging / Validation Webhook Trigger */}
        {status !== 'aprovado' && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Validação em Ambiente de Homologação
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Simule o recebimento do webhook bancário para atualizar a barra de metas e o painel administrativo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimulateBankPayment}
              disabled={isSimulating}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700"
            >
              {isSimulating ? 'Confirmando...' : 'Simular Pagamento Pix'}
            </button>
          </div>
        )}
      </section>

      {/* Dynamic Success Toast Alert (Bootstrap 5 Toast structure) */}
      {showToast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3 sm:p-4">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="toast show align-items-center text-bg-success"
          >
            <div className="toast-body d-flex align-items-center gap-2.5 fw-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Código Pix copiado com sucesso!</span>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Fechar notificação de cópia"
              className="min-h-[44px] min-w-[44px] d-flex align-items-center justify-content-center pr-2 text-white/90 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-white rounded-r-xl"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
