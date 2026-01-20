'use client';

import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const HOURLY_RATE = 1000;
const MATERIAL_MARGIN = 1.2;

export function MarginCalculator() {
    const [hours, setHours] = useState(2);
    const [materialCost, setMaterialCost] = useState(5000);
    const [marketPrice, setMarketPrice] = useState(15000);

    const productionCost = (hours * HOURLY_RATE) + (materialCost * MATERIAL_MARGIN);
    const profit = marketPrice - productionCost;
    const margin = marketPrice > 0 ? ((profit / marketPrice) * 100) : 0;
    const isProfitable = profit > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Калькулятор маржи</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Время (ч)</label>
                    <input
                        type="number"
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                       text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Материал (₽)</label>
                    <input
                        type="number"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                       text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Цена рынка (₽)</label>
                    <input
                        type="number"
                        value={marketPrice}
                        onChange={(e) => setMarketPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                       text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                    />
                </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/60">Себестоимость</span>
                    <span className="font-mono text-white">{productionCost.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/60">Прибыль</span>
                    <span className={`font-mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {profit > 0 ? '+' : ''}{profit.toLocaleString()} ₽
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm text-white/60 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Маржа
                    </span>
                    <motion.span
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={`text-xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}
                    >
                        {margin.toFixed(1)}%
                    </motion.span>
                </div>
            </div>

            <p className="text-xs text-white/40 text-center">
                Ставка: {HOURLY_RATE} ₽/час • Наценка материалов: +20%
            </p>
        </div>
    );
}
