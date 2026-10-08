import React from 'react';
import { Bike, ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0A1329] text-white pt-12 pb-10 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pb-10 border-b border-gray-800 text-center sm:text-left">
          
          {/* Real Logo & Brand Description */}
          <div className="space-y-3 flex flex-col items-center sm:items-start">
            <img
              src="/logo-header.png"
              alt="Caca Store"
              className="h-14 w-auto object-contain rounded-lg shadow-xs"
            />
            <p className="text-xs text-gray-300 leading-relaxed max-w-sm">
              Pijamas 100% algodão e looks fitness com modelagem anatômica. Pronta entrega hoje em Garanhuns com entrega expressa ou em até 24h.
            </p>
          </div>

          {/* Entrega Expressa */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">
              Entrega em Garanhuns
            </h4>
            <ul className="text-xs text-gray-300 space-y-2">
              <li className="flex items-center justify-center sm:justify-start gap-2">
                <Bike className="w-4 h-4 text-[#D4AF37]" />
                <span>Entrega Expressa Hoje & em 24h</span>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Frete Grátis no Combo 2 Pijamas</span>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Opção de Retirada no Local</span>
              </li>
            </ul>
          </div>

          {/* Pagamento */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">
              Formas de Pagamento
            </h4>
            <ul className="text-xs text-gray-300 space-y-2">
              <li className="flex items-center justify-center sm:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00B048]" />
                <span>Pix Imediato com confirmação na hora</span>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00B048]" />
                <span>Link Cartão (em até 3x sem juros)</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 text-center">
          <p>© {new Date().getFullYear()} Caca Store. Todos os direitos reservados. Garanhuns - PE.</p>
          <p className="text-gray-400">Moda Íntima & Fitness</p>
        </div>

      </div>
    </footer>
  );
};
