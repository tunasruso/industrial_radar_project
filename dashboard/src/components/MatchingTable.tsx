'use client';

import { useState } from 'react';
import { Target, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchingItem {
    Article_No: string;
    Product_Name: string;
    Confidence_Score: number;
    Estimated_Cost: number;
    Category: string;
    Material: string;
}

// Mock data - в реальном приложении загружается из rd_backlog.csv
const mockMatches: MatchingItem[] = [
    { Article_No: 'BRK-001', Product_Name: 'Пробоотборник ПГО-400', Confidence_Score: 92, Estimated_Cost: 18500, Category: 'Sampling', Material: '316L' },
    { Article_No: 'BRK-015', Product_Name: 'Вентиль ВИ-64-6 G1/2"', Confidence_Score: 88, Estimated_Cost: 4200, Category: 'Valves', Material: '12Х18Н10Т' },
    { Article_No: 'BRK-042', Product_Name: 'Пластина медная 40x50x2', Confidence_Score: 85, Estimated_Cost: 850, Category: 'Plates', Material: 'Латунь' },
    { Article_No: 'BRK-078', Product_Name: 'Бомба Рейда в сборе', Confidence_Score: 82, Estimated_Cost: 38000, Category: 'Pressure Vessels', Material: '316L' },
    { Article_No: 'BRK-103', Product_Name: 'Вискозиметр ВЗ-246', Confidence_Score: 79, Estimated_Cost: 8500, Category: 'Labware', Material: 'Алюминий' },
    { Article_No: 'BRK-156', Product_Name: 'Переходник к ПГО', Confidence_Score: 77, Estimated_Cost: 2400, Category: 'Fittings', Material: '316L' },
    { Article_No: 'BRK-201', Product_Name: 'Микрошприц МШ-10', Confidence_Score: 76, Estimated_Cost: 2900, Category: 'Labware', Material: 'Glass/SS' },
];

const materials = ['Все', '316L', '12Х18Н10Т', 'Латунь', 'Алюминий'];

export function MatchingTable() {
    const [filter, setFilter] = useState('Все');
    const [sortBy, setSortBy] = useState<'score' | 'cost'>('score');

    const filteredData = mockMatches
        .filter(item => filter === 'Все' || item.Material.includes(filter))
        .sort((a, b) => sortBy === 'score'
            ? b.Confidence_Score - a.Confidence_Score
            : a.Estimated_Cost - b.Estimated_Cost
        );

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Matching Feed</h3>
                    <span className="text-xs text-white/40 ml-2">Топ аналогов Bürkle</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-white/40" />
                {materials.map((mat) => (
                    <button
                        key={mat}
                        onClick={() => setFilter(mat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all
              ${filter === mat
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-white/60 border border-transparent hover:border-white/20'
                            }`}
                    >
                        {mat}
                    </button>
                ))}
                <button
                    onClick={() => setSortBy(sortBy === 'score' ? 'cost' : 'score')}
                    className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-xs 
                     bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortBy === 'score' ? 'По релевантности' : 'По стоимости'}
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-white/50 text-xs uppercase sticky top-0 bg-[#0A0F14]">
                        <tr>
                            <th className="text-left py-2 px-3">Артикул</th>
                            <th className="text-left py-2 px-3">Продукт</th>
                            <th className="text-center py-2 px-3">Score</th>
                            <th className="text-right py-2 px-3">Себестоимость</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredData.map((item, idx) => (
                                <motion.tr
                                    key={item.Article_No}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                                >
                                    <td className="py-3 px-3 font-mono text-cyan-400 text-xs">{item.Article_No}</td>
                                    <td className="py-3 px-3">
                                        <div className="text-white">{item.Product_Name}</div>
                                        <div className="text-xs text-white/40">{item.Category} • {item.Material}</div>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <span className={`
                      inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm
                      ${item.Confidence_Score >= 85
                                                ? 'bg-green-500/20 text-green-400'
                                                : item.Confidence_Score >= 75
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-white/10 text-white/60'
                                            }
                    `}>
                                            {item.Confidence_Score}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-white/80">
                                        {item.Estimated_Cost.toLocaleString()} ₽
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
