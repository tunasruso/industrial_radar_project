import { FileText, ExternalLink, Beaker, Flame, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Интерфейс для отчета
interface Report {
    id: number;
    title: string;
    query: string;
    url: string;
    content: string; // Markdown content
    created_at: string;
}

export function RDInsights() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const fetchReports = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('research_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) setReports(data);
        setIsLoading(false);
    };

    const clearTableOnMount = async () => {
        // Очищаем таблицу отчетов при загрузке
        console.log("🧹 Clearing research_reports table...");
        const { error } = await supabase
            .from('research_reports')
            .delete()
            .neq('id', 0); // Удаляет все записи

        if (error) {
            console.error("Failed to clear research_reports:", error);
        } else {
            console.log("✅ Research reports cleared");
        }
    };

    useEffect(() => {
        // При первом монтировании очищаем и затем подписываемся
        const init = async () => {
            setIsLoading(true);
            await clearTableOnMount();
            setReports([]);
            setIsLoading(false);
        };
        init();

        // Подписка на обновления (Realtime)
        const channel = supabase
            .channel('research_updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'research_reports' },
                (payload) => {
                    console.log("RDInsights: New report received", payload.new);
                    setReports((current) => [payload.new as Report, ...current].slice(0, 10));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">R&D Инсайты</h3>
                </div>
                <button
                    onClick={fetchReports}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    title="Обновить"
                >
                    <RefreshCw className={`w-4 h-4 text-white/30 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-3 min-h-[100px]">
                {reports.length === 0 && !isLoading && (
                    <div className="text-center text-white/30 text-xs py-4">Нет отчетов. Нажмите &quot;Поиск&quot;</div>
                )}

                {reports.map((item) => {
                    // Определение типа по заголовку или запросу
                    const isTender = item.query.toLowerCase().includes('тендер') || item.query.toLowerCase().includes('закуп');
                    const isWelding = item.title.toLowerCase().includes('weld') || item.query.toLowerCase().includes('weld');

                    let Icon = Beaker;
                    let color = 'text-purple-400';
                    let bgColor = 'bg-purple-500/10';

                    if (isTender) {
                        Icon = FileText;
                        color = 'text-blue-400';
                        bgColor = 'bg-blue-500/10';
                    } else if (isWelding) {
                        Icon = Flame;
                        color = 'text-orange-400';
                        bgColor = 'bg-orange-500/10';
                    }

                    return (
                        <div
                            key={item.id}
                            onClick={() => setSelectedReport(item)}
                            className="block p-4 rounded-xl bg-white/[0.02] border border-white/10 
                         hover:border-white/20 transition-all cursor-pointer group hover:bg-white/[0.04]"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${bgColor}`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-white text-sm truncate pr-2">{item.title}</h4>
                                        {/* Ссылка на источник (отдельно от клика по карточке) */}
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={item.url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()} // Чтобы не открывать модалку
                                                className="hover:bg-white/10 p-1 rounded transition-colors"
                                                title="Открыть источник"
                                            >
                                                <ExternalLink className="w-4 h-4 text-white/30 hover:text-white/80 transition-colors flex-shrink-0" />
                                            </a>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 truncate">{item.query}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-white/40 text-center mt-4">
                Кликните на карточку для просмотра деталей
            </p>

            {/* Модальное окно просмотра отчета */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-1">{selectedReport.title}</h2>
                                    <p className="text-xs text-white/40 font-mono">{selectedReport.query}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {/* Рендерим Markdown как текст, сохраняя форматирование */}
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-white/80 leading-relaxed break-words">
                                        {selectedReport.content || "Нет детального контента для этого отчета."}
                                    </pre>
                                </div>

                                {selectedReport.url && (
                                    <div className="mt-8 pt-4 border-t border-white/10">
                                        <a
                                            href={selectedReport.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Перейти к источнику
                                        </a>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
