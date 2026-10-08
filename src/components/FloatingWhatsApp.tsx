import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

export const FloatingWhatsApp: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const phoneNumber = '5531997584189';
  const defaultMessage = encodeURIComponent(
    'Olá! Estava navegando no catálogo da Caca Store e prefiro ser atendida pelo WhatsApp.'
  );

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-5 duration-300">
      
      {/* Botão Flutuante com Card de Atendimento WhatsApp */}
      <a
        href={`https://wa.me/${phoneNumber}?text=${defaultMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 sm:gap-3 bg-white text-gray-900 pl-2 sm:pl-2.5 pr-3.5 sm:pr-4 py-2 sm:py-2 rounded-full sm:rounded-2xl shadow-2xl border-2 border-emerald-100 hover:border-[#25D366] hover:shadow-[0_12px_32px_rgba(37,211,102,0.35)] transition-all duration-300 hover:scale-104 cursor-pointer active:scale-98 ring-1 ring-black/5"
        title="Prefere atendimento no WhatsApp? Clique para conversar!"
        aria-label="Atendimento no WhatsApp"
      >
        {/* Ícone Pulsante Oficial do WhatsApp com Efeito Radar */}
        <div className="relative flex items-center justify-center shrink-0">
          <span className="absolute w-full h-full bg-[#25D366] rounded-full animate-ping opacity-40" />
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg group-hover:rotate-6 group-hover:scale-105 transition-all">
            <WhatsAppIcon variant="symbol" className="w-6.5 h-6.5 sm:w-7 sm:h-7 text-white fill-white drop-shadow-xs" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-xs" />
        </div>

        {/* Textos de Atendimento */}
        <div className="text-left leading-tight pr-1">
          <div className="text-xs sm:text-sm font-black text-gray-900 group-hover:text-[#25D366] transition-colors flex items-center gap-1.5">
            Prefere WhatsApp?
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
              Online agora
            </span>
          </div>
        </div>
      </a>

      {/* Botão sutil de fechar/ocultar */}
      <button
        onClick={() => setIsDismissed(true)}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
        title="Ocultar botão"
      >
        <X className="w-3 h-3" />
      </button>

    </div>
  );
};
