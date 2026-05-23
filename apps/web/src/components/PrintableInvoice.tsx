"use client";

import React from 'react';

interface InvoiceProps {
  order: any;
}

export const PrintableInvoice = ({ order }: InvoiceProps) => {
  return (
    <div className="hidden print:block p-8 bg-white text-black w-[80mm] mx-auto text-sm">
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold">DEVITE CONTROL</h1>
        <p className="text-xs">عربة العصائر والحلويات</p>
        <p className="text-[10px] mt-1">الرياض - المملكة العربية السعودية</p>
      </div>

      <div className="flex justify-between mb-4 font-bold">
        <span>رقم الطلب: #{order.orderNumber}</span>
        <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
      </div>

      <div className="border-b border-gray-300 mb-4 pb-2">
        <div className="flex justify-between font-bold mb-2">
          <span className="w-1/2 text-right">الصنف</span>
          <span className="w-1/4 text-center">الكمية</span>
          <span className="w-1/4 text-left">السعر</span>
        </div>
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between mb-1">
            <span className="w-1/2 text-right">{item.product.name}</span>
            <span className="w-1/4 text-center">{item.quantity}</span>
            <span className="w-1/4 text-left">{item.price}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-right">
        <div className="flex justify-between">
          <span className="font-bold">الإجمالي الفرعي:</span>
          <span>{order.total} د.ب</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2">
          <span>الإجمالي النهائي:</span>
          <span>{order.total} د.ب</span>
        </div>
      </div>

      <div className="text-center mt-8 border-t border-dashed border-gray-400 pt-4">
        <p className="text-[10px]">شكراً لزيارتكم!</p>
        <p className="text-[10px]">نحن نسعد بخدمتكم دائماً</p>
      </div>
    </div>
  );
};
