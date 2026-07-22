"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, PlusCircle, Tag, Package, X, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = ["☕","🍵","🧃","🥤","🍹","🍰","🥐","🍞","🥗","🍱","🥘","🍜","🍔","🍕","🍗","🌮"];

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const productsQuery = trpc.getProducts.useQuery();
  const categoriesQuery = trpc.getCategories.useQuery();
  const inventoryQuery = trpc.getInventory.useQuery();

  const createProductMutation = trpc.createProduct.useMutation();
  const updateProductMutation = trpc.updateProduct.useMutation();
  const deleteProductMutation = trpc.deleteProduct.useMutation();
  const toggleAvailMutation = trpc.toggleProductAvailability.useMutation();
  const toggleVisMutation = trpc.toggleProductVisibility.useMutation();
  const addCategoryMutation = trpc.addCategory.useMutation();
  const updateCategoryMutation = trpc.updateCategory.useMutation();
  const deleteCategoryMutation = trpc.deleteCategory.useMutation();

  const refetchAll = () => { productsQuery.refetch(); categoriesQuery.refetch(); };

  const filteredProducts = selectedCategory === "all"
    ? productsQuery.data
    : productsQuery.data?.filter(p => p.categoryId === selectedCategory);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  return (
    <div className="min-h-screen bg-brand-black p-10">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-brand-gold">إدارة الأصناف</h1>
          <p className="text-gray-500 mt-1">إضافة وتعديل الأصناف والتصنيفات</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "categories" && (
            <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
              className="bg-brand-navy-light border border-white/10 px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
              <Tag size={18} /> إضافة تصنيف
            </button>
          )}
          {activeTab === "products" && (
            <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
              className="bg-brand-orange px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-orange/20">
              <Plus size={20} /> إضافة صنف جديد
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-white/5 pb-4">
        <button onClick={() => setActiveTab("products")}
          className={`font-bold pb-2 border-b-2 transition-all ${activeTab === "products" ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-500"}`}>
          الأصناف ({productsQuery.data?.length ?? 0})
        </button>
        <button onClick={() => setActiveTab("categories")}
          className={`font-bold pb-2 border-b-2 transition-all ${activeTab === "categories" ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-500"}`}>
          التصنيفات ({categoriesQuery.data?.length ?? 0})
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <>
          {/* Category Filter */}
          <div className="flex gap-3 flex-wrap mb-8">
            <button onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === "all" ? "bg-brand-orange text-white" : "bg-brand-navy-light text-gray-400 hover:text-white"}`}>
              الكل
            </button>
            {categoriesQuery.data?.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat.id ? "bg-brand-orange text-white" : "bg-brand-navy-light text-gray-400 hover:text-white"}`}>
                {cat.name} ({(cat as any)._count?.products ?? 0})
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts?.map(product => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-brand-navy-light rounded-[32px] border border-white/5 overflow-hidden group relative">
                
                {/* Action buttons */}
                {isAdminOrManager && (
                  <div className="absolute top-3 left-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                      className="p-2 bg-brand-navy/80 backdrop-blur rounded-xl text-brand-gold border border-white/10">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm(product.id)}
                      className="p-2 bg-red-500/20 backdrop-blur rounded-xl text-red-500 border border-red-500/20">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={async () => {
                      await toggleVisMutation.mutateAsync({ id: product.id, isHidden: !product.isHidden });
                      productsQuery.refetch();
                    }}
                      className={`p-2 backdrop-blur rounded-xl border ${product.isHidden ? "bg-gray-500/20 text-gray-400 border-gray-500/20" : "bg-blue-500/20 text-blue-400 border-blue-500/20"}`}
                      title={product.isHidden ? "إظهار في المنيو" : "إخفاء من المنيو"}
                    >
                      {product.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}

                {/* Hidden Badge */}
                {product.isHidden && deleteConfirm !== product.id && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <span className="bg-black/80 text-white font-bold px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <EyeOff size={16} className="text-gray-400" /> مخفي من المنيو
                    </span>
                  </div>
                )}

                {/* Availability toggle */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  <button onClick={async () => {
                    let reason = undefined;
                    if (product.dynamicAvailable) {
                      reason = prompt("الرجاء إدخال سبب إيقاف الصنف (اختياري):") || undefined;
                    }
                    await toggleAvailMutation.mutateAsync({ id: product.id, available: !product.available, unavailableReason: reason });
                    productsQuery.refetch();
                  }} className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${product.dynamicAvailable ? "bg-green-500/20 text-green-500 hover:bg-red-500/20 hover:text-red-500" : "bg-red-500/20 text-red-500 hover:bg-green-500/20 hover:text-green-500"}`}>
                    {product.dynamicAvailable ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {product.dynamicAvailable ? "متوفر" : "غير متوفر"}
                  </button>
                  {!product.dynamicAvailable && product.unavailableReason && (
                    <span className="bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-md backdrop-blur border border-white/10">
                      {product.unavailableReason}
                    </span>
                  )}
                </div>

                {product.image ? (
                  <div className={`aspect-video bg-brand-navy flex items-center justify-center overflow-hidden ${product.isHidden ? 'opacity-30 grayscale' : ''}`}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className={`aspect-video bg-brand-navy flex items-center justify-center text-5xl ${product.isHidden ? 'opacity-30 grayscale' : ''}`}>
                    {EMOJIS[product.name.length % EMOJIS.length]}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                       {product.name}
                       {(product as any).isLossMaking && (
                         <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded flex items-center gap-1" title="تكلفة الإنتاج أعلى من سعر البيع">
                           <AlertCircle size={12} /> خسارة
                         </span>
                       )}
                    </h3>
                    <span className="text-brand-orange font-black text-lg">{product.price} د.ب</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                     <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest">{product.category.name}</p>
                     <p className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">متوفر: {(product as any).dynamicAvailable ?? '∞'}</p>
                  </div>
                  {product.description && <p className="text-gray-500 text-xs mb-3">{product.description}</p>}
                  <div className="flex flex-col gap-2 text-[10px] text-gray-500 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                       <span>التكلفة (يدوي): <span className="text-gray-300">{product.cost} د.ب</span></span>
                       {(product as any).autoCost > 0 && (
                          <span>التكلفة (تلقائي): <span className="text-brand-orange font-bold">{(product as any).autoCost} د.ب</span></span>
                       )}
                    </div>
                    <div className="flex justify-between">
                       <span>الربح المتوقع: <span className="text-green-500 font-bold">{Math.round((product.price - ((product as any).autoCost > 0 ? (product as any).autoCost : product.cost)) * 1000) / 1000} د.ب</span></span>
                       <span>وقت التحضير: <span className="text-gray-300">{product.prepTime} دقيقة</span></span>
                    </div>
                  </div>
                </div>

                {/* Delete confirm overlay */}
                {deleteConfirm === product.id && (
                  <div className="absolute inset-0 bg-brand-navy/95 backdrop-blur flex flex-col items-center justify-center gap-4 p-6 rounded-[32px] z-50">
                    <Trash2 className="text-red-500" size={32} />
                    <p className="text-center font-bold">هل تريد حذف "{product.name}"؟</p>
                    <div className="flex gap-3 w-full">
                      <button onClick={async () => {
                        try {
                          await deleteProductMutation.mutateAsync({ id: product.id });
                          setDeleteConfirm(null); 
                          refetchAll();
                        } catch (err: any) {
                          alert("لا يمكن حذف هذا الصنف لارتباطه بطلبات أو بيانات سابقة. يمكنك (إخفاؤه من المنيو) بدلاً من حذفه للحفاظ على سجلات البيع.");
                          setDeleteConfirm(null);
                        }
                      }} className="flex-1 bg-red-500 py-2 rounded-xl font-bold text-sm">حذف</button>
                      <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-white/10 py-2 rounded-xl font-bold text-sm">إلغاء</button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoriesQuery.data?.map(cat => (
            <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-brand-navy-light rounded-[32px] p-8 border border-white/5 relative group">
              {isAdminOrManager && (
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                    className="p-2 bg-brand-navy rounded-xl text-brand-gold">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={async () => {
                    try { await deleteCategoryMutation.mutateAsync({ id: cat.id }); refetchAll(); }
                    catch(e: any) { alert(e.message); }
                  }} className="p-2 bg-red-500/20 rounded-xl text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <div className="w-14 h-14 bg-brand-black rounded-2xl flex items-center justify-center mb-5 text-2xl">
                <Tag className="text-brand-gold" />
              </div>
              <h3 className="text-2xl font-black mb-1">{cat.name}</h3>
              <p className="text-gray-500 text-sm">{(cat as any)._count?.products ?? 0} صنف</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {showProductModal && (
          <ProductModal
            product={editingProduct}
            categories={categoriesQuery.data ?? []}
            inventory={inventoryQuery.data?.data ?? []}
            onClose={() => setShowProductModal(false)}
            onSave={async (data: any) => {
              try {
                // Filter out empty ingredients
                const cleanedIngredients = data.ingredients?.filter((i:any) => i.inventoryItemId !== "");
                const cleanedVariants = data.variants?.map((v:any) => ({
                   ...v,
                   ingredients: v.ingredients?.filter((i:any) => i.inventoryItemId !== "") || []
                }));

                const payload = {
                  ...data,
                  ingredients: cleanedIngredients,
                  variants: cleanedVariants
                };

                if (editingProduct) {
                  await updateProductMutation.mutateAsync({ id: editingProduct.id, ...payload });
                } else {
                  await createProductMutation.mutateAsync(payload);
                }
                setShowProductModal(false);
                refetchAll();
              } catch (e: any) {
                alert(`خطأ في الحفظ: ${e.message}`);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <CategoryModal
            category={editingCategory}
            onClose={() => setShowCategoryModal(false)}
            onSave={async (name: string) => {
              try {
                if (editingCategory) {
                  await updateCategoryMutation.mutateAsync({ id: editingCategory.id, name });
                } else {
                  await addCategoryMutation.mutateAsync({ name });
                }
                setShowCategoryModal(false);
                refetchAll();
              } catch (e: any) {
                alert(`خطأ في الحفظ: ${e.message}`);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductModal({ product, categories, inventory, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    cost: product?.cost ?? "",
    prepTime: product?.prepTime ?? 5,
    categoryId: product?.categoryId ?? "",
    available: product?.available ?? true,
    image: product?.image ?? "",
    sugarLevels: product?.sugarLevels ?? [],
    iceLevels: product?.iceLevels ?? []
  });
  const [ingredients, setIngredients] = useState<any[]>(
    product?.ingredients?.map((i: any) => ({ inventoryItemId: i.inventoryItemId, amountRequired: i.amountRequired })) ?? []
  );
  const [variants, setVariants] = useState<any[]>(
    product?.variants?.map((v: any) => ({
      id: v.id,
      sizeName: v.sizeName,
      price: v.price,
      prepTime: v.prepTime || 5,
      ingredients: v.ingredients?.map((i: any) => ({ inventoryItemId: i.inventoryItemId, amountRequired: i.amountRequired })) ?? []
    })) ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedSystemCost = ingredients.reduce((sum, ing) => {
    const invItem = inventory?.find((i: any) => i.id === ing.inventoryItemId);
    return sum + (invItem ? invItem.unitPrice * ing.amountRequired : 0);
  }, 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSave({ ...form, ingredients, variants });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-brand-navy-light w-full max-w-2xl rounded-[40px] border border-white/10 p-10 overflow-y-auto max-h-[92vh]">
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-brand-gold">{product ? "تعديل الصنف" : "إضافة صنف جديد"}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 bg-white/5 rounded-xl disabled:opacity-50"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="اسم الصنف">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="field-input" placeholder="مثلاً: قهوة عربية" />
            </Field>
            <Field label="التصنيف">
              <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="field-input">
                <option value="">اختر التصنيف...</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="الوصف (اختياري)">
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="field-input" placeholder="وصف مختصر للصنف" />
            </Field>
            <Field label="صورة الصنف">
              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setForm({...form, image: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-brand-black p-3 rounded-xl border border-white/5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-brand-orange file:text-white hover:file:bg-orange-600"
                />
                {form.image && (
                  <div className="w-12 h-12 bg-brand-black rounded-lg overflow-hidden shrink-0">
                     <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <Field label="سعر البيع (د.ب)">
              <input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="field-input" />
            </Field>
            <div className="space-y-1">
              <Field label="التكلفة اليدوية (د.ب)">
                <input type="number" value={form.cost} onChange={e => setForm({...form, cost: Number(e.target.value)})} className="field-input" />
              </Field>
              {calculatedSystemCost > 0 && (
                <div className="text-[10px] bg-brand-orange/10 text-brand-orange px-2 py-1 rounded-md border border-brand-orange/20 mt-1">
                   تكلفة النظام الآلية: <strong>{calculatedSystemCost.toFixed(3)} د.ب</strong>
                </div>
              )}
            </div>
            <Field label="وقت التحضير (دقيقة)">
              <input type="number" value={form.prepTime} onChange={e => setForm({...form, prepTime: Number(e.target.value)})} className="field-input" />
            </Field>
          </div>

          <div className="flex items-center gap-3 p-4 bg-brand-black rounded-2xl border border-white/5">
            <input type="checkbox" id="avail" checked={form.available} onChange={e => setForm({...form, available: e.target.checked})} className="w-5 h-5 accent-brand-orange" />
            <label htmlFor="avail" className="font-bold cursor-pointer">الصنف متاح للطلب</label>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-4">
             <h4 className="font-bold text-brand-orange">إعدادات الإضافات (اختياري)</h4>
             <p className="text-xs text-gray-400 mb-2">أدخل القيم مفصولة بفاصلة. اتركها فارغة إذا لم تكن هناك خيارات.</p>
             <Field label="مستويات السكر">
                <input value={form.sugarLevels.join(', ')} onChange={e => setForm({...form, sugarLevels: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="field-input" placeholder="مثلاً: بدون، قليل، وسط، زيادة" />
             </Field>
             <Field label="كميات الثلج">
                <input value={form.iceLevels.join(', ')} onChange={e => setForm({...form, iceLevels: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="field-input" placeholder="مثلاً: بدون، خفيف، عادي، زيادة" />
             </Field>
          </div>

          {/* Variants (Sizes) */}
          <div className="border-t border-white/5 pt-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-brand-orange">خيارات الأحجام / الأنواع المتوفرة</h4>
                <p className="text-xs text-gray-400 mt-1">تجاهل هذه القائمة إذا كان للصنف حجم واحد وسعر ثابت.</p>
              </div>
              <button type="button" onClick={() => setVariants([...variants, { sizeName: "", price: Number(form.price), prepTime: 5, ingredients: [] }])}
                className="text-brand-gold text-sm flex items-center gap-1 hover:scale-105 transition-transform">
                <PlusCircle size={16} /> إضافة حجم
              </button>
            </div>
            {variants.length > 0 && (
              <div className="space-y-4">
                {variants.map((v, vIdx) => (
                  <div key={vIdx} className="bg-brand-black p-4 rounded-2xl border border-white/10 relative">
                    <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== vIdx))} className="absolute top-4 left-4 text-red-500 bg-red-500/10 p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={16}/></button>
                    <div className="grid grid-cols-3 gap-3 mb-3 pr-10">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">اسم الحجم (مثال: S, كبير)</label>
                        <input value={v.sizeName} onChange={e => { const nv = [...variants]; nv[vIdx].sizeName = e.target.value; setVariants(nv); }} className="field-input py-2 text-sm" placeholder="اسم الحجم" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">السعر (د.ب)</label>
                        <input type="number" value={v.price} onChange={e => { const nv = [...variants]; nv[vIdx].price = Number(e.target.value); setVariants(nv); }} className="field-input py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">وقت التحضير (د)</label>
                        <input type="number" value={v.prepTime} onChange={e => { const nv = [...variants]; nv[vIdx].prepTime = Number(e.target.value); setVariants(nv); }} className="field-input py-2 text-sm" />
                      </div>
                    </div>
                    
                    {/* Variant Ingredients */}
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-brand-gold">مكونات هذا الحجم تحديداً:</span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              التكلفة التلقائية: {(v.ingredients.reduce((acc: number, ing: any) => {
                                const item = inventory.find((i: any) => i.id === ing.inventoryItemId);
                                return acc + (item ? item.unitPrice * ing.amountRequired : 0);
                              }, 0)).toFixed(3)} د.ب
                            </span>
                          </div>
                          <button type="button" onClick={() => { const nv = [...variants]; nv[vIdx].ingredients.push({ inventoryItemId: "", amountRequired: 0 }); setVariants(nv); }} className="text-[10px] text-brand-orange bg-brand-orange/10 px-2 py-1 rounded">
                            + إضافة مكون
                          </button>
                        </div>
                      {v.ingredients.map((ing: any, iIdx: number) => (
                        <div key={iIdx} className="flex gap-2 items-end mb-2">
                          <select value={ing.inventoryItemId} onChange={e => { const nv = [...variants]; nv[vIdx].ingredients[iIdx].inventoryItemId = e.target.value; setVariants(nv); }} className="flex-1 bg-brand-navy-light border border-white/5 rounded-lg p-2 text-xs">
                            <option value="">اختر مادة...</option>
                            {inventory.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                          <input type="number" value={ing.amountRequired} onChange={e => { const nv = [...variants]; nv[vIdx].ingredients[iIdx].amountRequired = Number(e.target.value); setVariants(nv); }} className="w-20 bg-brand-navy-light border border-white/5 rounded-lg p-2 text-xs" placeholder="الكمية" />
                          <button type="button" onClick={() => { const nv = [...variants]; nv[vIdx].ingredients = nv[vIdx].ingredients.filter((_: any, i: number) => i !== iIdx); setVariants(nv); }} className="p-2 text-red-500"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="border-t border-white/5 pt-5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-brand-orange">ربط المكونات بالمخزون</h4>
              <button onClick={() => setIngredients([...ingredients, { inventoryItemId: "", amountRequired: 0 }])}
                className="text-brand-gold text-sm flex items-center gap-1 hover:scale-105 transition-transform">
                <PlusCircle size={16} /> إضافة مكون
              </button>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-3 items-end mb-3">
                <div className="flex-1">
                  <select value={ing.inventoryItemId}
                    onChange={e => { const n = [...ingredients]; n[idx].inventoryItemId = e.target.value; setIngredients(n); }}
                    className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm">
                    <option value="">اختر مادة...</option>
                    {inventory.map((item: any) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <input type="number" value={ing.amountRequired} placeholder="الكمية"
                    onChange={e => { const n = [...ingredients]; n[idx].amountRequired = Number(e.target.value); setIngredients(n); }}
                    className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
                </div>
                <button onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  className="p-3 bg-red-500/10 rounded-xl text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="flex-1 bg-brand-orange py-4 rounded-2xl font-black text-xl shadow-lg disabled:opacity-50">
              {product ? "حفظ التعديلات" : "إضافة الصنف"}
            </button>
            <button onClick={onClose} disabled={isSubmitting} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-xl disabled:opacity-50">إلغاء</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CategoryModal({ category, onClose, onSave }: any) {
  const [name, setName] = useState(category?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSave(name);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-brand-navy-light w-full max-w-sm rounded-[40px] border border-white/10 p-10">
        <h2 className="text-2xl font-black text-brand-gold mb-8">{category ? "تعديل التصنيف" : "إضافة تصنيف"}</h2>
        <Field label="اسم التصنيف">
          <input value={name} onChange={e => setName(e.target.value)} className="field-input" placeholder="مثلاً: المشروبات الباردة" />
        </Field>
        <div className="flex gap-4 mt-8">
          <button onClick={handleSubmit} disabled={!name || isSubmitting} className="flex-1 bg-brand-orange py-4 rounded-2xl font-bold disabled:opacity-50">حفظ</button>
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold disabled:opacity-50">إلغاء</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
