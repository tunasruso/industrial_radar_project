'use client';

import { useState, useEffect } from 'react';
import { supabase, MatchResult } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { FileDown, Calendar, Database, Search, FileText, ChevronRight, ArrowLeft, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Link from 'next/link';

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

    const handleMatchClick = (match: MatchResult) => {
        // Пытаемся найти связанный отчет по названию (эвристика)
        // Т.к. мы обрезаем имя в matching до 100 символов, ищем вхождение
        const relatedReport = tenderData.find(t => t.title.includes(match.product_name) || match.product_name.includes(t.title.slice(0, 50)));

        if (relatedReport) {
            setSelectedReport(relatedReport);
        } else {
            // Если отчета нет (например это старый легаси матч), показываем заглушку или алерт
            // Но лучше показать хотя бы то что есть
            alert(`Детальный отчет для "${match.product_name}" не найден в базе R&D.`);
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">Архив данных</h1>
                            <div className="flex items-center gap-2 text-sm text-white/40">
                                <Database className="w-4 h-4" />
                                <span>Бза данных R&D и производственных совпадений</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-all"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Скачать Excel
                    </button>
                </header>

                <div className="bg-white/5 p-1 rounded-xl flex mb-6 w-fit">
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

                <div className="glass-card p-0 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-white/30">Загрузка данных...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {activeTab === 'matching' ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-white/40 border-b border-white/10">
                                        <tr>
                                            <th className="p-4 font-medium">Артикул</th>
                                            <th className="p-4 font-medium">Продукт</th>
                                            <th className="p-4 font-medium">Категория</th>
                                            <th className="p-4 font-medium">Score</th>
                                            <th className="p-4 font-medium text-right">Стоимость</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matchData.map((item) => (
                                            <tr
                                                key={item.id}
                                                onClick={() => handleMatchClick(item)}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                            >
                                                <td className="p-4 font-mono text-cyan-400">{item.article}</td>
                                                <td className="p-4 font-medium text-white group-hover:text-cyan-200 transition-colors">
                                                    {item.product_name}
                                                </td>
                                                <td className="p-4 text-white/60">
                                                    <span className="px-2 py-1 rounded bg-white/5 text-xs">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`font-bold ${item.confidence_score > 80 ? 'text-green-400' : 'text-amber-400'
                                                        }`}>
                                                        {item.confidence_score}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-white/60">
                                                    {item.estimated_cost?.toLocaleString()} ₽
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 p-4">
                                    {tenderData.map((report) => (
                                        <div
                                            key={report.id}
                                            onClick={() => setSelectedReport(report)}
                                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-all hover:bg-white/[0.07]"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-lg text-white">{report.title}</h3>
                                                <span className="text-xs text-white/30 font-mono">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/60 mb-3 line-clamp-2">{report.query}</p>
                                            <div className="flex items-center gap-2">
                                                {report.content.includes("✅") ? (
                                                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs border border-green-500/20">Подходит</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs border border-amber-500/20">Проверка</span>
                                                )}
                                                <span className="text-xs text-cyan-400 flex items-center gap-1">
                                                    Подробнее <ExternalLink className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reuse the Modal Logic */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0F161E] w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-[#151b24]">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{selectedReport.title}</h3>
                                    <a
                                        href={selectedReport.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20"
                                    >
                                        Открыть источник <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0F161E]">
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <div className="bg-white/5 p-4 rounded-xl mb-6 border border-white/10">
                                        <h4 className="text-white font-semibold mb-2 mt-0">Анализ AI</h4>
                                        <div className="text-white/80 whitespace-pre-wrap font-mono text-xs">
                                            {selectedReport.content.split('---').pop()?.trim()}
                                        </div>
                                    </div>

                                    <h4 className="text-white/60 uppercase text-xs font-bold tracking-wider mb-4">Полный отчет</h4>
                                    <div className="text-white/70 whitespace-pre-wrap leading-relaxed">
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
