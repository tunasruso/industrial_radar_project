'use client';

import { useState, useEffect } from 'react';
import { Target, Filter, ArrowUpDown, ExternalLink } from 'lucide-react';
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

interface ResearchReport {
    id: number;
    title: string;
    url: string;
    content: string;
    created_at: string;
}

const materials = ['Все', '316L', '12Х18Н10Т', 'Латунь', 'Алюминий'];

export function MatchingTable() {
    const [matches, setMatches] = useState<MatchingItem[]>([]);
    const [filter, setFilter] = useState('Все');
    const [sortBy, setSortBy] = useState<'score' | 'cost'>('score');
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);

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

    const clearTableOnMount = async () => {
        // Очищаем таблицу при загрузке компонента
        // Старые данные остаются в research_reports (Архив)
        console.log("🧹 Clearing matching_results table...");
        const { error } = await supabase
            .from('matching_results')
            .delete()
            .neq('id', 0); // Удаляет все записи

        if (error) {
            console.error("Failed to clear table:", error);
        } else {
            console.log("✅ Table cleared");
        }
    };

    useEffect(() => {
        // При первом монтировании очищаем и затем подписываемся
        clearTableOnMount().then(() => {
            setMatches([]); // Сбрасываем локальный стейт
        });

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

    const handleRowClick = async (item: MatchingItem) => {
        // Очищаем строку поиска от спецсимволов, которые могут ломать ilike
        const cleanName = item.product_name.replace(/[^\w\sа-яА-ЯёЁ.-]/gi, ' ').trim();
        const searchTerm = cleanName.slice(0, 30); // Берем первые 30 чистых символов для надежности

        const { data } = await supabase
            .from('research_reports')
            .select('*')
            .ilike('title', `%${searchTerm}%`)
            .limit(1)
            .single();

        if (data) {
            setSelectedReport(data);
        } else {
            // Явное уведомление для пользователя
            alert(`Отчет для "${item.product_name.slice(0, 20)}..." не найден в базе R&D.\n\nВозможно, это старая запись или название слишком отличается.`);
        }
    };

    const filteredData = matches
        .filter(item => filter === 'Все' || (item.material && item.material.includes(filter)))
        .sort((a, b) => sortBy === 'score'
            ? b.confidence_score - a.confidence_score
            : a.estimated_cost - b.estimated_cost
        );

    return (
        <div className="h-full flex flex-col relative">
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
                                        onClick={() => handleRowClick(item)}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group"
                                    >
                                        <td className="py-3 px-3 font-mono text-cyan-400 text-xs group-hover:underline decoration-dashed decoration-cyan-400/50 underline-offset-4">{item.article}</td>
                                        <td className="py-3 px-3">
                                            <div className="text-white truncate max-w-[200px] group-hover:text-cyan-200 transition-colors" title={item.product_name}>{item.product_name}</div>
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

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0F161E] w-full h-[90%] rounded-xl border border-white/20 shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-white/10 bg-[#151b24] flex justify-between items-start">
                                <div>
                                    <h3 className="text-md font-bold text-white mb-1 line-clamp-1 pr-4">{selectedReport.title}</h3>
                                    <a
                                        href={selectedReport.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                                    >
                                        Открыть источник <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="text-white/50 hover:text-white">✕</button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-[#0F161E]">
                                <div className="prose prose-invert prose-xs max-w-none">
                                    <div className="bg-white/5 p-3 rounded-lg mb-4 border border-white/10">
                                        <h4 className="text-white font-semibold mb-1 mt-0 text-xs uppercase opacity-70">Вердикт AI</h4>
                                        <div className="text-white/90 font-mono text-xs">
                                            {selectedReport.content.split('---').pop()?.trim()}
                                        </div>
                                    </div>
                                    <div className="text-white/70 whitespace-pre-wrap text-sm">
                                        {(() => {
                                            const content = selectedReport.content.replace(/#{1,6}\s/g, '').split('---')[0];
                                            const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);
                                            return parts.map((part, i) => {
                                                const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                                                if (match) {
                                                    return (
                                                        <a
                                                            key={i}
                                                            href={match[2]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-cyan-400 hover:underline break-all font-medium inline-flex items-center gap-1"
                                                        >
                                                            {match[1]} <ExternalLink className="w-3 h-3 inline" />
                                                        </a>
                                                    );
                                                }
                                                return <span key={i}>{part}</span>;
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
