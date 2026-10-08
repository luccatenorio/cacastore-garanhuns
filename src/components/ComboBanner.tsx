import React from 'react';
import { Gift, Zap, CheckCircle2 } from 'lucide-react';

interface ComboBannerProps {
  onScrollToPijamas: () => void;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ onScrollToPijamas }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0B152D] via-[#0E1A38] to-[#081022] border border-[#D4AF37]/40 p-6 sm:p-10 overflow-hidden shadow-2xl shadow-[#D4AF37]/5">
        
        {/* Luxury Gold Curved Accents */}
        <div className="absolute -top-20 -right-20 w-64 h-64 border border-[#D4AF37]/20 rounded-full pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 border border-[#D4AF37]/30 rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 border border-[#D4AF37]/20 rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          <div className="space-y-3.5 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 text-[#F6E6B4] text-[11px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full border border-[#D4AF37]/40">
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
              Condição Exclusiva de Lançamento
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              Leve 2 Pijamas por apenas <span className="gold-gradient-text text-3xl sm:text-4xl lg:text-5xl font-extrabold">R$ 190,00</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Escolha qualquer modelo americano ou babydoll 100% algodão. O desconto de R$ 20,00 é aplicado automaticamente na sacola e você ganha <strong className="text-white">Entrega Expressa Grátis</strong> na sua porta hoje em Garanhuns!
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-[#F6E6B4]">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                100% Algodão Puro
              </span>
              <span className="flex items-center gap-1.5 text-[#F6E6B4]">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                Entrega Hoje em Garanhuns
              </span>
              <span className="flex items-center gap-1.5 text-[#F6E6B4]">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                Pix ou Cartão em 3x
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0 flex flex-col items-center">
            <button
              onClick={onScrollToPijamas}
              className="gold-gradient-bg text-[#060B18] px-8 py-4 rounded-full font-extrabold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-xl shadow-[#D4AF37]/25 active:scale-95 flex items-center gap-2 group cursor-pointer"
            >
              <Gift className="w-4 h-4 text-[#060B18] group-hover:rotate-12 transition-transform" />
              <span>Ver Pijamas do Combo</span>
            </button>
            <span className="text-[11px] text-[#D4AF37] font-semibold mt-2.5 flex items-center gap-1">
              ⚡ Poucas unidades restantes no estoque local
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};
