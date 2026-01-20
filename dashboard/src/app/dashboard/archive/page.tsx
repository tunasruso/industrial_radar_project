'use client';

import { useState, useEffect } from 'react';
import { supabase, MatchResult } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { FileDown, Calendar, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

export default function ArchivePage() {
    const [data, setData] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: results, error } = await supabase
            .from('matching_results')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching data:', error);
        else setData(results || []);
        setLoading(false);
    };

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Archive");
        XLSX.writeFile(workbook, "radar_archive.xlsx");
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <Header />
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-cyan-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Архив Поиска</h1>
                        <p className="text-white/50 text-sm">История мэтчинга и выгрузка отчетов</p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 
                     border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-all"
                >
                    <FileDown className="w-5 h-5" />
                    Скачать Excel
                </button>
            </div>

            <div className="glass-card overflow-hidden">
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
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                                    Загрузка данных...
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                                    История пуста
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={item.id}
                                    className="hover:bg-white/[0.02]"
                                >
                                    <td className="px-4 py-3 text-white/60 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-cyan-400">{item.article}</td>
                                    <td className="px-4 py-3 text-white">{item.product_name}</td>
                                    <td className="px-4 py-3 text-white/60">
                                        {item.category} • {item.material}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`
                      inline-block w-8 h-8 leading-8 rounded-lg font-bold text-xs
                      ${item.confidence_score >= 85 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}
                    `}>
                                            {item.confidence_score}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-white/80">
                                        {item.estimated_cost.toLocaleString()} ₽
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
