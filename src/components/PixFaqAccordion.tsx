import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const PIX_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'copia-e-cola',
    question: 'Como faço para pagar pelo mesmo celular sem precisar tirar print do QR Code?',
    answer:
      'Após escolher o valor e tocar em "Apoiar Agora", toque no botão azul "Copiar Código Pix". Em seguida, abra o aplicativo do seu banco, acesse a área Pix, selecione a opção "Pix Copia e Cola", cole o código e confirme o pagamento.',
  },
  {
    id: 'comprovante-whatsapp',
    question: 'Preciso enviar o comprovante no WhatsApp ou criar uma conta para doar?',
    answer:
      'Não. Você não precisa criar senha, informar CPF nem enviar comprovantes manualmente. Assim que o pagamento Pix é concluído no banco, o sistema confirma a doação automaticamente para a equipe da O.S.C Amigos da Mara.',
  },
  {
    id: 'taxas',
    question: 'Existe alguma taxa ou desconto sobre o valor que eu doar?',
    answer:
      'Não há taxas de intermediários. O código Pix é gerado diretamente para a instituição, garantindo que 100% do valor escolhido chegue integralmente às ações da O.S.C Amigos da Mara.',
  },
  {
    id: 'atualizacao-barra',
    question: 'Em quanto tempo minha doação aparece na barra de progresso da campanha?',
    answer:
      'A confirmação ocorre em poucos segundos após o pagamento no aplicativo do banco. Assim que o banco notifica o sistema, o valor arrecadado e a porcentagem da barra de metas são atualizados automaticamente.',
  },
  {
    id: 'anonimato',
    question: 'Posso apoiar a campanha de forma anônima?',
    answer:
      'Sim. Na tela do Checkout Pix, o campo "Nome ou Apelido" é totalmente opcional. Se você deixá-lo em branco, sua contribuição será registrada como "Apoiador anônimo".',
  },
];

export const PixFaqAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(PIX_FAQ_ITEMS[0].id);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="duvidas-pix"
      aria-labelledby="faq-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="mb-6">
        <h2 id="faq-heading" className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Dúvidas frequentes sobre a doação Pix
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Informações rápidas para concluir seu apoio com segurança e sem complicações.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
        {PIX_FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const buttonId = `faq-trigger-${item.id}`;
          const panelId = `faq-panel-${item.id}`;

          return (
            <div key={item.id}>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full min-h-[56px] px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-700"
              >
                <span className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-sky-700 dark:text-sky-400' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-5 sm:px-6 pb-5 pt-1 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
