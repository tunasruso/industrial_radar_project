'use client';

import { useState, useEffect } from 'react';
import { Target, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface MatchingItem {
    id: number;
    article: string;
    product_name: string;
    confidence_score: number;
    estimated_cost: number;
    category: string;
    material: string;
}

const materials = ['Все', '316L', '12Х18Н10Т', 'Латунь', 'Алюминий'];

export function MatchingTable() {
    const [matches, setMatches] = useState<MatchingItem[]>([]);
    const [filter, setFilter] = useState('Все');
    const [sortBy, setSortBy] = useState<'score' | 'cost'>('score');
    const [isLoading, setIsLoading] = useState(true);

    const fetchMatches = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('matching_results')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setMatches(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMatches();

        // Подписка на обновления (Realtime)
        const channel = supabase
            .channel('matching_updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'matching_results' },
                (payload) => {
                    setMatches((current) => [payload.new as MatchingItem, ...current].slice(0, 20));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredData = matches
        .filter(item => filter === 'Все' || (item.material && item.material.includes(filter)))
        .sort((a, b) => sortBy === 'score'
            ? b.confidence_score - a.confidence_score
            : a.estimated_cost - b.estimated_cost
        );

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Matching Feed</h3>
                    <span className="text-xs text-white/40 ml-2">Топ аналогов и тендеров</span>
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
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm">
                    <thead className="text-white/50 text-xs uppercase sticky top-0 bg-[#0A0F14] z-10">
                        <tr>
                            <th className="text-left py-2 px-3">Артикул</th>
                            <th className="text-left py-2 px-3">Продукт</th>
                            <th className="text-center py-2 px-3">Score</th>
                            <th className="text-right py-2 px-3">Себестоимость</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {isLoading && matches.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-white/30">Загрузка...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-white/30">Нет совпадений</td></tr>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <motion.tr
                                        key={item.id || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                                    >
                                        <td className="py-3 px-3 font-mono text-cyan-400 text-xs">{item.article}</td>
                                        <td className="py-3 px-3">
                                            <div className="text-white truncate max-w-[200px]" title={item.product_name}>{item.product_name}</div>
                                            <div className="text-xs text-white/40">{item.category} • {item.material}</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`
                          inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm
                          ${item.confidence_score >= 85
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : item.confidence_score >= 75
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-white/10 text-white/60'
                                                }
                        `}>
                                                {item.confidence_score}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-white/80">
                                            {item.estimated_cost > 0 ? `${item.estimated_cost.toLocaleString()} ₽` : '—'}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
