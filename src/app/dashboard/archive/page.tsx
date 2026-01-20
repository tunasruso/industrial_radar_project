'use client';

import { useState, useEffect } from 'react';
import { supabase, MatchResult } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { FileDown, Calendar, Database, Search, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

interface ResearchReport {
    id: number;
    title: string;
    query: string;
    url: string;
    content: string;
    created_at: string;
}

export default function ArchivePage() {
    const [activeTab, setActiveTab] = useState<'matching' | 'tenders'>('matching');
    const [matchData, setMatchData] = useState<MatchResult[]>([]);
    const [tenderData, setTenderData] = useState<ResearchReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);

    const fetchData = async () => {
        setLoading(true);

        // Fetch Matching Results
        const { data: matches } = await supabase
            .from('matching_results')
            .select('*')
            .order('created_at', { ascending: false });

        if (matches) setMatchData(matches);

        // Fetch Research/Tenders
        const { data: tenders } = await supabase
            .from('research_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (tenders) setTenderData(tenders);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        if (activeTab === 'matching') {
            const ws = XLSX.utils.json_to_sheet(matchData);
            XLSX.utils.book_append_sheet(wb, ws, "Matching");
        } else {
            const ws = XLSX.utils.json_to_sheet(tenderData);
            XLSX.utils.book_append_sheet(wb, ws, "Tenders");
        }

        XLSX.writeFile(wb, `industrial_radar_${activeTab}.xlsx`);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <Header />
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-cyan-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Архив Данных</h1>
                        <p className="text-white/50 text-sm">История поиска и производственного анализа</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/5 p-1 rounded-xl flex">
                        <button
                            onClick={() => setActiveTab('matching')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'matching' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Каталог (Matching)
                        </button>
                        <button
                            onClick={() => setActiveTab('tenders')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tenders' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Тендеры (Research)
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white/60 
                         border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                    >
                        <FileDown className="w-5 h-5" />
                        Экспорт
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="p-12 text-center text-white/40">Загрузка архива...</div>
                ) : (
                    activeTab === 'matching' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white/5 text-white/60 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Дата</th>
                                        <th className="px-4 py-3 text-left">Артикул</th>
                                        <th className="px-4 py-3 text-left">Продукт</th>
                                        <th className="px-4 py-3 text-left">Категория</th>
                                        <th className="px-4 py-3 text-center">Score</th>
                                        <th className="px-4 py-3 text-right">Стоимость</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {matchData.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-white/30">Нет данных</td></tr>
                                    ) : (
                                        matchData.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 text-white/60 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-cyan-400">{item.article}</td>
                                                <td className="px-4 py-3 text-white">{item.product_name}</td>
                                                <td className="px-4 py-3 text-white/60">{item.category} • {item.material}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.confidence_score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                                        }`}>
                                                        {item.confidence_score}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-white/80">
                                                    {item.estimated_cost.toLocaleString()} ₽
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 p-4">
                            {tenderData.length === 0 ? (
                                <div className="text-center text-white/30 py-12">Тендеров не найдено</div>
                            ) : (
                                tenderData.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group"
                                        onClick={() => setSelectedReport(item)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                                                {item.title}
                                            </h3>
                                            <span className="text-xs text-white/40 font-mono">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                                            <span className="bg-white/5 px-2 py-1 rounded">Query: {item.query}</span>
                                            <a href={item.url} target="_blank" onClick={e => e.stopPropagation()} className="hover:text-white flex items-center gap-1">
                                                Источник <ChevronRight className="w-3 h-3" />
                                            </a>
                                        </div>
                                        {/* Превью анализа из контента - ищем строку с Analyze */}
                                        <div className="text-xs text-white/60 line-clamp-2 font-mono bg-black/20 p-2 rounded border border-white/5">
                                            {item.content.includes('Анализ производства:')
                                                ? item.content.split('Анализ производства:')[1].split('\n')[0]
                                                : 'Анализ не проводился...'}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Modal for Details */}
            <AnimatePresence>
                {selectedReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            className="bg-[#0A0A0A] border border-white/10 w-full max-w-3xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/10 bg-white/[0.02] flex justify-between">
                                <h2 className="text-xl font-bold text-white pr-8">{selectedReport.title}</h2>
                                <button onClick={() => setSelectedReport(null)} className="text-white/50 hover:text-white">✕</button>
                            </div>
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <pre className="whitespace-pre-wrap font-sans text-sm text-white/80 leading-relaxed">
                                    {selectedReport.content}
                                </pre>
                                <div className="mt-8 pt-4 border-t border-white/10">
                                    <a href={selectedReport.url} target="_blank" className="btn-primary inline-flex items-center gap-2">
                                        Открыть источник <ChevronRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
