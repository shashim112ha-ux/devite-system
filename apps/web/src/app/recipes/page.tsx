"use client";

import { trpc } from "../../utils/trpc";
import { ChefHat, Printer, Beaker, FileText, Loader2, TrendingUp, DollarSign } from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export default function RecipesPage() {
  const { data: products, isLoading } = trpc.getProducts.useQuery();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrintAll = useReactToPrint({
    contentRef: printRef,
    documentTitle: "دليل المقادير والوصفات",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-gold" size={48} />
      </div>
    );
  }

  const recipeProducts = products?.filter(p => p.ingredients.length > 0 || p.variants.some(v => v.ingredients.length > 0)) || [];
  const allProducts = products || [];

  // Calculate cost per product
  const calcCost = (product: any): number => {
    if (product.ingredients && product.ingredients.length > 0) {
      return product.ingredients.reduce((sum: number, ing: any) => sum + (ing.amountRequired * (ing.inventoryItem?.unitPrice || 0)), 0);
    }
    return product.cost || 0;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-brand-navy-light/40 p-6 rounded-3xl border border-white/5 shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <ChefHat size={32} /> دليل المقادير والوصفات
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            وصفات تحضير المنتجات، التكاليف، والأرباح المتوقعة — قابل للطباعة للمطبخ
          </p>
        </div>
        <button 
          onClick={handlePrintAll}
          className="flex items-center gap-2 bg-brand-gold text-black font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors"
        >
          <Printer size={20} /> طباعة الكل (PDF)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-navy-light/50 p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي المنتجات</p>
          <p className="text-2xl font-black text-white">{allProducts.length}</p>
        </div>
        <div className="bg-brand-navy-light/50 p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-gray-400 mb-1">منتجات بوصفة محددة</p>
          <p className="text-2xl font-black text-brand-gold">{recipeProducts.length}</p>
        </div>
        <div className="bg-brand-navy-light/50 p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-gray-400 mb-1">متوسط التكلفة</p>
          <p className="text-2xl font-black text-brand-orange">
            {allProducts.length > 0 ? (allProducts.reduce((s, p) => s + calcCost(p), 0) / allProducts.length).toFixed(3) : '0.000'} د.ب
          </p>
        </div>
        <div className="bg-brand-navy-light/50 p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-gray-400 mb-1">متوسط هامش الربح</p>
          <p className="text-2xl font-black text-green-400">
            {allProducts.filter(p => p.price > 0).length > 0
              ? (allProducts.filter(p => p.price > 0).reduce((s, p) => {
                  const cost = calcCost(p);
                  return s + ((p.price - cost) / p.price * 100);
                }, 0) / allProducts.filter(p => p.price > 0).length).toFixed(1)
              : '0.0'}%
          </p>
        </div>
      </div>

      {/* Products Grid - All with Profitability + recipes where available */}
      <div ref={printRef}>
        <style type="text/css" media="print">
          {`
            @page { size: auto; margin: 15mm; }
            @media print {
              body { background: white !important; color: black !important; }
              .recipe-card { break-inside: avoid; border: 1px solid #ccc !important; background: #fff !important; box-shadow: none !important; margin-bottom: 16px; }
              .no-print { display: none !important; }
              .text-white { color: black !important; }
              .text-brand-gold { color: #8B6508 !important; }
              .text-gray-400, .text-gray-500, .text-gray-300 { color: #555 !important; }
              .bg-brand-navy, .bg-brand-navy-light, .bg-brand-black { background: #f9f9f9 !important; border: 1px solid #ddd !important; }
            }
          `}
        </style>

        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold border-b pb-4">دليل المقادير والوصفات</h1>
          <p className="text-gray-500 mt-2">طبع في: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        {allProducts.length === 0 ? (
          <div className="bg-brand-navy-light/30 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center">
             <Beaker size={64} className="text-brand-orange mb-4 opacity-50" />
             <h3 className="text-2xl font-bold text-white mb-2">لا توجد منتجات مسجلة</h3>
             <p className="text-gray-400">قم بإضافة المنتجات من قسم إدارة المنتجات.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {allProducts.map(product => {
              const cost = calcCost(product);
              const profit = product.price - cost;
              const margin = product.price > 0 ? (profit / product.price * 100) : 0;
              const hasRecipe = product.ingredients.length > 0 || product.variants.some(v => v.ingredients.length > 0);

              return (
                <div key={product.id} className="recipe-card bg-brand-navy border border-white/5 rounded-[30px] p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-3xl -z-10 group-hover:bg-brand-orange/10 transition-colors"></div>
                  
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-white">{product.name}</h3>
                        {hasRecipe && <span className="text-[10px] bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full">📋 وصفة</span>}
                      </div>
                      <p className="text-brand-gold text-xs font-bold">{product.category?.name || '—'}</p>
                    </div>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-xl border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-brand-black rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                        <ChefHat className="text-gray-600" size={20} />
                      </div>
                    )}
                  </div>

                  {/* Pricing Info */}
                  <div className="grid grid-cols-3 gap-2 bg-brand-black/40 rounded-2xl p-3 border border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 mb-0.5">سعر البيع</p>
                      <p className="text-sm font-black text-brand-gold">{product.price.toFixed(3)}</p>
                    </div>
                    <div className="text-center border-x border-white/5">
                      <p className="text-[10px] text-gray-500 mb-0.5">التكلفة</p>
                      <p className="text-sm font-black text-brand-orange">{cost.toFixed(3)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 mb-0.5">الربح</p>
                      <p className={`text-sm font-black ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit.toFixed(3)}</p>
                    </div>
                  </div>

                  {/* Margin Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">هامش الربح</span>
                      <span className={`text-xs font-bold ${margin >= 40 ? 'text-green-400' : margin >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>{margin.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${margin >= 40 ? 'bg-green-400' : margin >= 20 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(margin, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Base Ingredients */}
                  {product.ingredients.length > 0 && (
                    <div className="mt-1">
                      <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 mb-2"><FileText size={14} /> المقادير الأساسية:</h4>
                      <ul className="space-y-1.5">
                        {product.ingredients.map((ing: any) => (
                          <li key={ing.id} className="bg-brand-black/40 border border-white/5 p-2 rounded-xl flex justify-between items-center">
                            <span className="text-gray-300 text-xs font-medium">{ing.inventoryItem?.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-brand-orange font-bold text-xs bg-brand-orange/10 px-2 py-0.5 rounded">{ing.amountRequired} {ing.inventoryItem?.unit}</span>
                              <span className="text-gray-500 text-[10px]">{((ing.amountRequired || 0) * (ing.inventoryItem?.unitPrice || 0)).toFixed(3)} د.ب</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Variant Ingredients */}
                  {product.variants.some(v => v.ingredients.length > 0) && (
                    <div className="space-y-2 border-t border-white/5 pt-3 mt-1">
                      <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2"><FileText size={14} /> مقادير الأحجام:</h4>
                      {product.variants.map(variant => variant.ingredients.length > 0 && (
                        <div key={variant.id} className="bg-brand-navy-light/40 border border-white/5 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold text-brand-gold text-xs">{variant.sizeName}</h5>
                            <span className="text-xs text-gray-500">سعر: {variant.price.toFixed(3)} د.ب</span>
                          </div>
                          <ul className="space-y-1">
                            {variant.ingredients.map((ing: any) => (
                              <li key={ing.id} className="bg-brand-black/40 p-2 rounded-lg flex justify-between items-center">
                                <span className="text-gray-300 text-xs">{ing.inventoryItem?.name}</span>
                                <span className="text-brand-orange font-bold text-xs">{ing.amountRequired} {ing.inventoryItem?.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasRecipe && (
                    <div className="text-center py-2 text-xs text-gray-600 border-t border-white/5 mt-1">
                      لا توجد وصفة محددة — التكلفة من الإدخال اليدوي
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
