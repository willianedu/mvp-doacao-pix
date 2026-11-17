import React from 'react';
import { ExternalLink } from 'lucide-react';

interface SocialLinksSectionProps {
  campaignTitle?: string;
}

interface SocialLinkItem {
  id: string;
  name: string;
  handle: string;
  href: string;
  ariaLabel: string;
  iconBgClass: string;
  iconTextClass: string;
  icon: React.ReactNode;
}

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({ campaignTitle }) => {
  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://amigosdamara.org.br';
  const message = campaignTitle
    ? `Conheça e apoie a campanha "${campaignTitle}" da O.S.C Amigos da Mara: ${shareUrl}`
    : `Conheça e apoie as ações solidárias da O.S.C Amigos da Mara: ${shareUrl}`;
  const whatsappText = encodeURIComponent(message);

  const socialLinks: SocialLinkItem[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      handle: '@amigosdamara',
      href: 'https://www.instagram.com/amigosdamara/',
      ariaLabel: 'Abrir perfil oficial da O.S.C Amigos da Mara no Instagram em nova aba',
      iconBgClass: 'bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800',
      iconTextClass: 'text-pink-700 dark:text-pink-400',
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      id: 'facebook',
      name: 'Facebook',
      handle: 'O.S.C Amigos da Mara',
      href: 'https://www.facebook.com/amigosdamara',
      ariaLabel: 'Abrir página oficial da O.S.C Amigos da Mara no Facebook em nova aba',
      iconBgClass: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      iconTextClass: 'text-sky-700 dark:text-sky-400',
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      handle: 'Compartilhar campanha',
      href: `https://api.whatsapp.com/send?text=${whatsappText}`,
      ariaLabel: 'Compartilhar a campanha da O.S.C Amigos da Mara pelo WhatsApp em nova aba',
      iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      iconTextClass: 'text-emerald-700 dark:text-emerald-400',
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="redes-sociais"
      aria-labelledby="social-links-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-4 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="mb-6">
        <h2
          id="social-links-heading"
          className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100"
        >
          Redes sociais do projeto
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Acompanhe as entregas, eventos comunitários e novidades da O.S.C Amigos da Mara.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {socialLinks.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.ariaLabel}
            className="min-h-[64px] px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <span
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBgClass} ${item.iconTextClass}`}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                  {item.name}
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap truncate mt-0.5">
                  {item.handle}
                </span>
              </span>
            </span>
            <ExternalLink
              className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </section>
  );
};
