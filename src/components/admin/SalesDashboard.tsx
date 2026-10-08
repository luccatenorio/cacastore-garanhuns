import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Package, Calendar, Clock, ArrowUpRight, RotateCcw, Plus, Tag, Check, Filter, ShoppingBag, AlertCircle, Trash2, ZoomIn } from 'lucide-react';
import { SaleRecord, Product } from '../../types';

interface ImageHoverPreview {
  url: string;
  name: string;
  subtext?: string;
  price?: number;
  x: number;
  y: number;
}

interface SalesDashboardProps {
  sales: SaleRecord[];
  products: Product[];
  onRecordSale: (saleData: {
    productId?: string;
    productName: string;
    productImage?: string;
    category?: string;
    size: string;
    quantity: number;
    price: number;
    costPrice: number;
    paymentMethod: string;
    notes?: string;
    saleDate: string;
  }) => Promise<void>;
  onDeleteSale: (saleId: string, restoreStock: boolean) => Promise<void>;
  onClearAllSales?: () => Promise<void>;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  sales,
  products,
  onRecordSale,
  onDeleteSale,
  onClearAllSales,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [isManualSaleOpen, setIsManualSaleOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview de foto ampliada no hover
  const [hoveredImage, setHoveredImage] = useState<ImageHoverPreview | null>(null);

  const handleImageHover = (
    e: React.MouseEvent<HTMLElement>,
    data: { url: string; name: string; subtext?: string; price?: number }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 260;
    const popupHeight = 350;

    let x = rect.right + 14;
    if (x + popupWidth > window.innerWidth - 12) {
      x = Math.max(12, rect.left - popupWidth - 14);
    }

    let y = rect.top + rect.height / 2 - popupHeight / 2;
    if (y + popupHeight > window.innerHeight - 12) {
      y = window.innerHeight - popupHeight - 12;
    }
    if (y < 12) {
      y = 12;
    }

    setHoveredImage({
      ...data,
      x,
      y,
    });
  };

  const handleImageLeave = () => {
    setHoveredImage(null);
  };

  // Form states for manual sale
  const [manualProdId, setManualProdId] = useState('');
  const [manualSize, setManualSize] = useState('M');
  const [manualPrice, setManualPrice] = useState(100);
  const [manualCost, setManualCost] = useState(70);
  const [manualPayment, setManualPayment] = useState('pix');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtragem de vendas por período
  const filteredSales = useMemo(() => {
    if (filterPeriod === 'all') return sales;

    const now = new Date();
    return sales.filter((s) => {
      const sDate = s.saleDate || s.createdAt.split('T')[0];
      if (filterPeriod === 'today') {
        return sDate === todayStr;
      }
      if (filterPeriod === '7days') {
        const diffDays = (now.getTime() - new Date(sDate).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (filterPeriod === '30days') {
        const diffDays = (now.getTime() - new Date(sDate).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [sales, filterPeriod, todayStr]);

  // Métricas agregadas
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.price, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
  const totalPieces = filteredSales.reduce((acc, s) => acc + (s.quantity || 1), 0);
  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Métricas exclusivas de Hoje
  const todaySales = sales.filter((s) => (s.saleDate || s.createdAt.split('T')[0]) === todayStr);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.price, 0);
  const todayProfit = todaySales.reduce((acc, s) => acc + s.profit, 0);
  const todayPieces = todaySales.reduce((acc, s) => acc + (s.quantity || 1), 0);

  // Vendas Agrupadas por Dia
  const salesByDay = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; profit: number; count: number; sales: SaleRecord[] }>();

    filteredSales.forEach((sale) => {
      const dateKey = sale.saleDate || sale.createdAt.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, { date: dateKey, revenue: 0, profit: 0, count: 0, sales: [] });
      }
      const dayData = map.get(dateKey)!;
      dayData.revenue += sale.price;
      dayData.profit += sale.profit;
      dayData.count += sale.quantity || 1;
      dayData.sales.push(sale);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales]);

  // Handler para seleção do produto na venda manual
  const handleProductChange = (prodId: string) => {
    setManualProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setManualPrice(prod.price);
      setManualCost(prod.costPrice || 70);
      const firstAvailableSize = prod.sizes.find(
        (s) => (prod.sizeStock ? (prod.sizeStock[s] || 0) > 0 : true)
      ) || prod.sizes[0] || 'M';
      setManualSize(firstAvailableSize);
    }
  };

  const handleManualSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === manualProdId);
    if (!prod) {
      alert('Selecione uma peça do estoque!');
      return;
    }

    await onRecordSale({
      productId: prod.id,
      productName: prod.name,
      productImage: prod.image,
      category: prod.category,
      size: manualSize,
      quantity: 1,
      price: Number(manualPrice),
      costPrice: Number(manualCost),
      paymentMethod: manualPayment,
      notes: manualNotes,
      saleDate: manualDate,
    });

    setIsManualSaleOpen(false);
    setManualNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Dashboard com Ações Rápidas */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00B048]" />
            <span>Dashboard & Metrificação de Vendas</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Acompanhe o faturamento diário, lucro real por tamanho e registre saídas do estoque com datas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Período */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-700">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterPeriod === 'all' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterPeriod === 'today' ? 'bg-white text-[#0A1329] font-bold shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setFilterPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterPeriod === '7days' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setFilterPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterPeriod === '30days' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              30 dias
            </button>
          </div>

          {/* Botão Zerar Vendas (para limpar testes ou histórico) */}
          {sales.length > 0 && onClearAllSales && (
            <button
              onClick={async () => {
                if (confirm('Tem certeza que deseja apagar TODAS as vendas do histórico? As métricas e o GMV serão zerados.')) {
                  await onClearAllSales();
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Zerar todo o histórico de vendas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zerar Vendas</span>
            </button>
          )}

          {/* Botão Registrar Venda Manual */}
          <button
            onClick={() => {
              if (products.length > 0 && !manualProdId) {
                handleProductChange(products[0].id);
              }
              setIsManualSaleOpen(true);
            }}
            className="bg-[#0A1329] hover:bg-[#16264C] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Lançar Venda</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hoje em Destaque */}
        <div className="bg-gradient-to-br from-[#0A1329] to-[#16264C] text-white p-5 rounded-2xl shadow-md space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="font-bold uppercase tracking-wider text-[11px] text-[#D4AF37]">Vendas de Hoje</span>
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {formatPrice(todayRevenue)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-300 pt-1 border-t border-white/10">
            <span>{todayPieces} peças vendidas</span>
            <span className="text-[#00B048] font-bold">+{formatPrice(todayProfit)} lucro</span>
          </div>
        </div>

        {/* Faturamento do Período */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span>Faturamento ({filterPeriod === 'all' ? 'Total' : filterPeriod})</span>
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {formatPrice(totalRevenue)}
          </p>
          <p className="text-xs text-gray-400">Total bruto vendido</p>
        </div>

        {/* Lucro Líquido Realizado */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
            <span>Lucro Líquido Real</span>
            <TrendingUp className="w-4 h-4 text-[#00B048]" />
          </div>
          <p className="text-2xl font-black text-[#00B048]">
            {formatPrice(totalProfit)}
          </p>
          <p className="text-xs text-gray-400">Descontando preço de custo</p>
        </div>

        {/* Peças Vendidas & Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span>Volume & Ticket Médio</span>
            <Package className="w-4 h-4 text-[#0A1329]" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {totalPieces} <span className="text-xs font-normal text-gray-400">peças</span>
          </p>
          <p className="text-xs text-gray-500">
            Ticket médio: <strong className="text-gray-800">{formatPrice(averageTicket)}</strong>
          </p>
        </div>
      </div>

      {/* 3. Vendas por Dia (Resumo Diário) */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#D4AF37]" />
          <span>Desempenho Diário de Vendas</span>
        </h3>

        {salesByDay.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-gray-300 space-y-2">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-600">Nenhuma venda registrada no período selecionado</p>
            <p className="text-[11px] text-gray-400">
              Quando você marcar uma peça como "Vendi" na aba de Estoque ou lançar uma venda, o histórico aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {salesByDay.map((day) => {
              const isToday = day.date === todayStr;
              return (
                <div
                  key={day.date}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                    isToday ? 'border-[#00B048]/40 ring-1 ring-[#00B048]/20' : 'border-gray-200'
                  }`}
                >
                  {/* Cabeçalho do Dia */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        isToday ? 'bg-[#00B048] text-white' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {formatDate(day.date)}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-[#00B048] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Hoje
                        </span>
                      )}
                      <span className="text-xs text-gray-500 font-semibold">
                        • {day.count} {day.count === 1 ? 'peça vendida' : 'peças vendidas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 text-[11px]">Faturamento: </span>
                        <strong className="text-gray-900 font-bold">{formatPrice(day.revenue)}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Lucro: </span>
                        <strong className="text-[#00B048] font-bold">{formatPrice(day.profit)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Peças Vendidas no Dia */}
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {day.sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-gray-50 hover:bg-gray-100/80 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sale.productImage ? (
                            <img
                              src={sale.productImage}
                              alt=""
                              onMouseEnter={(e) =>
                                handleImageHover(e, {
                                  url: sale.productImage!,
                                  name: sale.productName,
                                  subtext: `Tam: ${sale.size} • ${sale.category || 'Peça'}`,
                                  price: sale.price,
                                })
                              }
                              onMouseLeave={handleImageLeave}
                              className="w-10 h-12 rounded-lg object-cover shrink-0 border border-gray-300 cursor-zoom-in hover:ring-2 hover:ring-[#00B048] hover:scale-105 transition-all shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate leading-snug">
                              {sale.productName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="bg-[#0A1329] text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                                Tam: {sale.size}
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                {sale.paymentMethod === 'pix' ? 'Pix' : sale.paymentMethod === 'cartao_link' ? 'Cartão' : sale.paymentMethod}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-gray-900">{formatPrice(sale.price)}</p>
                          <p className="text-[10px] text-[#00B048] font-bold">+{formatPrice(sale.profit)}</p>
                          <button
                            onClick={() => setSaleToDelete(sale)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md border border-red-200/60 transition-colors cursor-pointer mt-1"
                            title="Apagar venda ou estornar peça"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Apagar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal para Lançamento de Venda Manual */}
      {isManualSaleOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#0A1329]" />
                  <span>Registrar Saída / Venda</span>
                </h3>
                <p className="text-xs text-gray-500">
                  A peça sairá do estoque do tamanho selecionado e o lucro entrará nas métricas.
                </p>
              </div>
              <button
                onClick={() => setIsManualSaleOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSaleSubmit} className="space-y-4 text-xs">
              
              {/* Produto */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Peça Vendida</label>
                <select
                  required
                  value={manualProdId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#0A1329]"
                >
                  <option value="">Selecione uma peça...</option>
                  {products.map((p) => (
                    <option key={`sale-prod-${p.id}`} value={p.id}>
                      {p.name} — {formatPrice(p.price)} (Total em estoque: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tamanho com Estoque Atual */}
              {manualProdId && (() => {
                const prod = products.find((p) => p.id === manualProdId);
                if (!prod) return null;
                const sizeList = prod.sizes || ['P', 'M', 'G', 'GG'];

                return (
                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                      Qual tamanho foi vendido?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {sizeList.map((s) => {
                        const stockForSize = prod.sizeStock ? (prod.sizeStock[s] || 0) : 0;
                        const isSelected = manualSize === s;

                        return (
                          <button
                            key={`btn-size-${s}`}
                            type="button"
                            onClick={() => setManualSize(s)}
                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#0A1329] text-white border-[#0A1329] shadow-xs'
                                : stockForSize > 0
                                ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                                : 'bg-red-50/50 border-red-200 text-red-700'
                            }`}
                          >
                            <span className="block font-black text-sm">{s}</span>
                            <span className={`block text-[10px] ${isSelected ? 'text-[#D4AF37]' : stockForSize > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                              {stockForSize} em estoque
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Valores: Preço e Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Valor da Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualPrice}
                    onChange={(e) => setManualPrice(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualCost}
                    onChange={(e) => setManualCost(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700"
                  />
                </div>
              </div>

              {/* Lucro Calculado */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800">Lucro gerado nesta venda:</span>
                <strong className="text-emerald-700 font-black text-sm">
                  {formatPrice(manualPrice - manualCost)}
                </strong>
              </div>

              {/* Forma de Pagamento e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Pagamento</label>
                  <select
                    value={manualPayment}
                    onChange={(e) => setManualPayment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_link">Link Cartão (3x)</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Data da Venda</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-semibold"
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Cliente buscou na loja / Entrega Heliópolis"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsManualSaleOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#00B048] hover:bg-[#00963d] text-white font-bold uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Venda</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Modal para Apagar Venda ou Estornar */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-black text-gray-900">Apagar Registro de Venda</h3>
              </div>
              <button
                onClick={() => setSaleToDelete(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Dados da venda */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center gap-3 text-xs">
              {saleToDelete.productImage ? (
                <img
                  src={saleToDelete.productImage}
                  alt=""
                  className="w-12 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-14 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{saleToDelete.productName}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Tamanho: <strong className="text-gray-900">{saleToDelete.size}</strong> • Data: {formatDate(saleToDelete.saleDate)}
                </p>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200/60 font-semibold">
                  <span className="text-gray-800">{formatPrice(saleToDelete.price)}</span>
                  <span className="text-[#00B048]">+{formatPrice(saleToDelete.profit)} lucro</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Como você deseja remover esta venda do sistema?
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Opção 1: Apenas apagar do histórico (venda errada / teste) */}
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  await onDeleteSale(saleToDelete.id, false);
                  setIsDeleting(false);
                  setSaleToDelete(null);
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-black text-red-700 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    Apenas Apagar Venda (Venda errada / Teste)
                  </strong>
                </div>
                <p className="text-[11px] text-red-600/90 mt-1">
                  Remove este registro do histórico e das métricas sem alterar o estoque atual das peças.
                </p>
              </button>

              {/* Opção 2: Estornar e devolver ao estoque (se o produto ainda existir) */}
              {products.some((p) => p.id === saleToDelete.productId) && (
                <button
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    await onDeleteSale(saleToDelete.id, true);
                    setIsDeleting(false);
                    setSaleToDelete(null);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-[#00B048]" />
                      Estornar e Devolver ao Estoque (+1 no Tam {saleToDelete.size})
                    </strong>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Exclui a venda e devolve 1 unidade ao estoque do tamanho {saleToDelete.size} (ideal para trocas ou cancelamentos de clientes).
                  </p>
                </button>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Flutuante com Zoom da Foto ao passar o mouse */}
      {hoveredImage && (
        <div
          style={{ left: `${hoveredImage.x}px`, top: `${hoveredImage.y}px` }}
          className="fixed z-50 pointer-events-none bg-white rounded-2xl p-2.5 shadow-2xl border-2 border-[#0A1329]/20 animate-in fade-in zoom-in-95 duration-150 w-64 flex flex-col gap-2 ring-1 ring-black/10 transition-transform"
        >
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner">
            <img
              src={hoveredImage.url}
              alt={hoveredImage.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <ZoomIn className="w-3 h-3 text-[#D4AF37]" />
              <span>Zoom HD</span>
            </div>
          </div>
          <div className="px-1 pb-0.5">
            <p className="font-extrabold text-gray-900 text-xs line-clamp-2 leading-tight">
              {hoveredImage.name}
            </p>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px]">
              {hoveredImage.subtext && (
                <span className="text-gray-500 font-medium truncate max-w-[130px]">
                  {hoveredImage.subtext}
                </span>
              )}
              {hoveredImage.price !== undefined && (
                <span className="font-black text-[#0A1329] ml-auto">
                  {formatPrice(hoveredImage.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
