import React from 'react';
import { Zap, Sparkles, ShieldCheck, Clock } from 'lucide-react';

export const MarqueeBanner: React.FC = () => {
  const marqueeItems = [
    { icon: <Zap className="w-5 h-5 text-[#D4AF37] shrink-0" />, text: 'ENTREGA EXPRESSA HOJE & ENTREGA EM 24H EM GARANHUNS' },
    { icon: <Sparkles className="w-5 h-5 text-[#D4AF37] shrink-0" />, text: 'COMBO 2 PIJAMAS POR R$ 190 COM FRETE GRÁTIS' },
    { icon: <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />, text: 'PAGAMENTO NO PIX OU LINK CARTÃO EM ATÉ 3X SEM JUROS' },
    { icon: <Clock className="w-5 h-5 text-[#D4AF37] shrink-0" />, text: 'OPÇÃO DE RETIRADA NO LOCAL DISPONÍVEL' },
  ];

  return (
    <div className="bg-[#0A1329] border-y-2 border-[#16264C] py-4 sm:py-5 overflow-hidden select-none shadow-md">
      <div className="animate-marquee flex items-center gap-10 whitespace-nowrap text-sm sm:text-base md:text-lg font-black tracking-wide text-white uppercase">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {item.icon}
            <span className="font-extrabold text-white drop-shadow-xs">{item.text}</span>
            <span className="text-[#D4AF37] font-black text-xl mx-5">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};
