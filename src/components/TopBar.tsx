import React from 'react';
import { Sparkles } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <div className="bg-[#0A1329] text-white py-2 px-3 text-[11px] sm:text-xs font-semibold tracking-wide border-b border-[#16264C]">
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center gap-2">
        <span className="inline-flex items-center gap-1 text-[#D4AF37] font-extrabold uppercase text-[10px]">
          <Sparkles className="w-3 h-3 fill-current" />
          Garanhuns:
        </span>
        <span className="text-gray-100 font-medium">
          Entrega Expressa Hoje & em 24h • Combo 2 Pijamas por <strong className="text-[#F6E6B4]">R$ 190</strong> com Frete Grátis!
        </span>
      </div>
    </div>
  );
};
