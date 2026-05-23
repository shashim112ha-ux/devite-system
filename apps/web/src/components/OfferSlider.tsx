"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const OfferSlider = ({ offers }: { offers: any[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (offers.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % offers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [offers]);

  if (offers.length === 0) return null;

  const current = offers[index];

  return (
    <div className="relative w-full h-[250px] rounded-[40px] overflow-hidden mb-12 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${current.imageUrl || 'https://images.unsplash.com/photo-1622597467827-43f063673c0f?auto=format&fit=crop&w=1000&q=80'})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/60 to-transparent p-12 flex flex-col justify-center">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
            >
              <span className="bg-brand-orange text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                {current.discount ? `خصم ${current.discount}%` : 'عرض لفترة محدودة'}
              </span>
              <h2 className="text-4xl font-black mb-2">{current.title}</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-md">{current.description}</p>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-black text-brand-gold">{current.price} د.ب</span>
                {current.oldPrice && <span className="text-gray-500 line-through">{current.oldPrice} د.ب</span>}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 left-12 flex gap-2">
        {offers.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-brand-orange' : 'w-2 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
};
