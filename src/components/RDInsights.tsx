'use client';

import { FileText, ExternalLink, Beaker, Flame, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// Интерфейс для отчета
interface Report {
    id: number;
    title: string;
    query: string;
    url: string;
    created_at: string;
}

export function RDInsights() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('research_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) setReports(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchReports();

        // Подписка на обновления (Realtime)
        const channel = supabase
            .channel('research_updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'research_reports' },
                (payload) => {
                    setReports((current) => [payload.new as Report, ...current].slice(0, 5));
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
                    <div className="text-center text-white/30 text-xs py-4">Нет отчетов. Нажмите &quot;Запустить поиск&quot;</div>
                )}

                {reports.map((item) => {
                    const isWelding = item.title.toLowerCase().includes('weld');
                    const Icon = isWelding ? Flame : Beaker;
                    const color = isWelding ? 'text-orange-400' : 'text-purple-400';
                    const bgColor = isWelding ? 'bg-orange-500/10' : 'bg-purple-500/10';

                    return (
                        <a
                            key={item.id}
                            href={item.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 rounded-xl bg-white/[0.02] border border-white/10 
                         hover:border-white/20 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${bgColor}`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-white text-sm truncate pr-2">{item.title}</h4>
                                        <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 truncate">{item.query}</p>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            <p className="text-xs text-white/40 text-center mt-4">
                Данные обновляются в реальном времени
            </p>
        </div>
    );
}
