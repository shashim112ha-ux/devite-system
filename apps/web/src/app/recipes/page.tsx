"use client";

import { trpc } from "../../utils/trpc";
import { ChefHat, Printer, Beaker, FileText, Loader2, ArrowLeft } from "lucide-react";
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

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-brand-navy-light/40 p-6 rounded-3xl border border-white/5 shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <ChefHat size={32} /> دليل المقادير والوصفات
          </h1>
          <p className="text-sm text-gray-400 mt-2">عرض وطباعة وصفات تحضير المنتجات والمقادير المحددة</p>
        </div>
        <button 
          onClick={handlePrintAll}
          className="flex items-center gap-2 bg-brand-gold text-black font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors"
        >
          <Printer size={20} /> طباعة الكل (PDF)
        </button>
      </div>

      {recipeProducts.length === 0 ? (
        <div className="bg-brand-navy-light/30 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center">
           <Beaker size={64} className="text-brand-orange mb-4 opacity-50" />
           <h3 className="text-2xl font-bold text-white mb-2">لا توجد وصفات مسجلة</h3>
           <p className="text-gray-400">قم بإضافة المنتجات والمقادير من قسم إدارة المنتجات لتظهر هنا.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={printRef}>
          {/* Printable Style injected when printing */}
          <style type="text/css" media="print">
            {`
              @page { size: auto; margin: 20mm; }
              @media print {
                body { background: white !important; color: black !important; }
                .recipe-card { break-inside: avoid; border: 1px solid #ccc !important; background: #fff !important; box-shadow: none !important; }
                .text-white { color: black !important; }
                .text-brand-gold { color: #8B6508 !important; }
                .text-gray-400, .text-gray-500 { color: #555 !important; }
                .bg-brand-navy-light, .bg-brand-black { background: #f9f9f9 !important; border: 1px solid #ddd !important; }
              }
            `}
          </style>

          <div className="hidden print:block col-span-2 text-center mb-8">
            <h1 className="text-3xl font-bold border-b pb-4">دليل المقادير والوصفات</h1>
            <p className="text-gray-500 mt-2">طبع في: {new Date().toLocaleDateString('ar-SA')}</p>
          </div>

          {recipeProducts.map(product => (
            <div key={product.id} className="recipe-card bg-brand-navy border border-white/5 rounded-[30px] p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-3xl -z-10 group-hover:bg-brand-orange/10 transition-colors"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-white">{product.name}</h3>
                  <p className="text-brand-gold text-sm font-bold mt-1">{product.category.name}</p>
                </div>
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                ) : (
                  <div className="w-16 h-16 bg-brand-black rounded-xl border border-white/5 flex items-center justify-center">
                    <ChefHat className="text-gray-600" size={24} />
                  </div>
                )}
              </div>

              {product.ingredients.length > 0 && (
                <div className="mt-2 space-y-2">
                  <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2"><FileText size={16} /> المقادير الأساسية:</h4>
                  <ul className="grid grid-cols-2 gap-2">
                    {product.ingredients.map(ing => (
                      <li key={ing.id} className="bg-brand-black/40 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-gray-300 font-medium">{ing.inventoryItem.name}</span>
                        <span className="text-brand-orange font-bold text-sm bg-brand-orange/10 px-2 py-1 rounded">{ing.amountRequired} {ing.inventoryItem.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.variants.some(v => v.ingredients.length > 0) && (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                  <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2"><FileText size={16} /> مقادير الأحجام/الخيارات:</h4>
                  {product.variants.map(variant => variant.ingredients.length > 0 && (
                    <div key={variant.id} className="bg-brand-navy-light/40 border border-white/5 p-4 rounded-xl">
                      <h5 className="font-bold text-brand-gold mb-2 text-sm">حجم/نوع: {variant.sizeName}</h5>
                      <ul className="grid grid-cols-2 gap-2">
                        {variant.ingredients.map((ing: any) => (
                          <li key={ing.id} className="bg-brand-black/40 p-2 rounded-lg flex justify-between items-center">
                            <span className="text-gray-300 text-xs font-medium">{ing.inventoryItem?.name}</span>
                            <span className="text-brand-orange font-bold text-xs">{ing.amountRequired} {ing.inventoryItem?.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
