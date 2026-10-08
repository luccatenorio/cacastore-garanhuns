import React from 'react';
import { Sparkles, Bike } from 'lucide-react';

export const HeaderBanner: React.FC = () => {
  return (
    <div className="bg-[#0A1329] text-white py-2.5 px-4 text-center text-xs md:text-sm font-medium tracking-wide relative overflow-hidden border-b border-[#D4AF37]/30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-[#D4AF37]/20 text-[#F6E6B4] text-[10px] md:text-xs uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full border border-[#D4AF37]/50 shadow-xs">
          <Sparkles className="w-3 h-3 text-[#D4AF37] animate-pulse" />
          Exclusivo do Anúncio
        </span>
        <span className="text-white/90">
          Preços de fábrica liberados <strong className="text-[#F6E6B4]">apenas para quem viu o anúncio</strong> • Entrega Expressa <strong className="text-[#D4AF37]">HOJE</strong> em Garanhuns!
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[#F6E6B4] font-semibold underline underline-offset-2 ml-1">
          <Bike className="w-3.5 h-3.5 text-[#D4AF37]" />
          Entrega Expressa e em até 24h
        </span>
      </div>
    </div>
  );
};
