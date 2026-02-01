'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { MachineCard, Machine } from '@/components/MachineCard';
import { MatchingTable } from '@/components/MatchingTable';
import { MarginCalculator } from '@/components/MarginCalculator';
import { RDInsights } from '@/components/RDInsights';
import { Activity, Factory, TrendingUp, Beaker, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { runResearchAction } from '@/app/actions/research';
import { motion, AnimatePresence } from 'framer-motion';

const stats = [
    { label: 'Станков всего', value: 16, icon: Factory, color: 'text-cyan-400' },
    { label: 'Простой', value: 4, icon: Activity, color: 'text-amber-400' },
    { label: 'Аналогов найдено', value: 127, icon: TrendingUp, color: 'text-green-400' },
    { label: 'R&D проектов', value: 3, icon: Beaker, color: 'text-purple-400' },
];

const TENDER_QUERIES = [
    "supply of chemical reactors tenders Kazakhstan 2025",
    "laboratory furniture procurement tenders Uzbekistan",
    "stainless steel tanks tenders Russia 2025",
    "CVD coating equipment demand Central Asia",
    "industrial welding equipment tenders Kazakhstan",
    "laboratory glassware tenders Kyrgyzstan",
    "sapfir reactor components tenders"
];

const CATALOG_QUERIES = [
    "Bürkle sampling systems catalog specifications",
    "Thermo Fisher Scientific laboratory reactors catalog",
    "IKA laboratory mixers and stirrers specifications",
    "Bürkle pumps manual pdf",
    "laboratory stainless steel fittings catalog",
    "industrial autoclave specifications 50L 100L",
    "Bürkle Zone Sampler manual"
];

const COMPETITOR_QUERIES = [
    "Экросхим лабораторная мебель каталог цены",
    "Прайс лист лабораторное оборудование 2024",
    "Тендеры на поставку реакторов цены конкурентов",
    "Производители лабораторной посуды Россия список",
    "Сравнение цен на сушильные шкафы SNOL",
    "manufacturers of laboratory reactors Russia",
    "suppliers of stainless steel chemical vessels",
    "производители лабораторных реакторов Россия",
    "конкуренты IKA, Thermo Fisher в России",
    "заводы по производству химического оборудования",
    "industrial mixers manufacturers europe",
    "поставщики автоклавов промышленных"
];

interface SearchStatus {
    status: 'idle' | 'searching' | 'success' | 'error';
    query?: string;
    message?: string;
}

interface SearchProgress {
    current: number;
    total: number;
}

export default function DashboardPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [searchStatus, setSearchStatus] = useState<SearchStatus>({ status: 'idle' });
    const [searchProgress, setSearchProgress] = useState<SearchProgress | undefined>(undefined);

    // Fetch machines on mount
    useEffect(() => {
        const fetchMachines = async () => {
            try {
                const res = await fetch('/api/machines');
                const data = await res.json();
                if (Array.isArray(data)) {
                    const mapped = data.map((m: any) => ({
                        Machine_Name: m.name,
                        Type: m.type,
                        Materials: m.materials,
                        Max_Pressure_MPa: m.max_pressure || m.maxPressure || 0,
                        Hourly_Rate_RUB: m.hourly_rate || m.hourlyRate || 0,
                        Status: m.status
                    }));
                    setMachines(mapped);
                }
            } catch (e) {
                console.error("Failed to fetch machines", e);
            }
        };
        fetchMachines();
    }, []);

    const handleScan = async (mode: 'tender' | 'catalog' | 'competitor', count: number, country: string = 'Russia') => {
        if (isScanning) return;
        setIsScanning(true);
        setSearchProgress({ current: 0, total: count });

        let queries = TENDER_QUERIES;
        if (mode === 'catalog') queries = CATALOG_QUERIES;
        if (mode === 'competitor') queries = COMPETITOR_QUERIES;

        let totalNewResults = 0;
        let completedSearches = 0;
        let foundCompetitors: string[] = [];

        try {
            for (let i = 0; i < count; i++) {
                const randomQuery = queries[Math.floor(Math.random() * queries.length)];
                setSearchProgress({ current: i + 1, total: count });
                setSearchStatus({ status: 'searching', query: `${randomQuery} (${country})` });

                console.log(`Scanning ${i + 1}/${count}: ${randomQuery} [${mode}, ${country}]`);

                try {
                    const result = await runResearchAction(randomQuery, mode, country);
                    if (result.success) {
                        totalNewResults += result.resultsCount || 0;
                        completedSearches++;
                        if (result.newCompetitors) {
                            foundCompetitors.push(...result.newCompetitors);
                        }
                    }
                } catch (e) {
                    console.error(`Error on search ${i + 1}:`, e);
                }

                // Небольшая задержка между запросами
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            let message = `Завершено ${completedSearches}/${count} запросов. Новых результатов: ${totalNewResults}`;
            if (foundCompetitors.length > 0) {
                const uniqueNames = Array.from(new Set(foundCompetitors));
                message = `Найдены конкуренты: ${uniqueNames.join(', ')}`;
            }

            setSearchStatus({
                status: 'success',
                message: message
            });
        } catch (e) {
            console.error(e);
            setSearchStatus({ status: 'error', message: 'Внутренняя ошибка' });
        } finally {
            setIsScanning(false);
            setSearchProgress(undefined);
            // Автоскрытие через 10 секунд для успеха
            setTimeout(() => setSearchStatus({ status: 'idle' }), 10000);
        }
    };

    const idleMachines = machines.filter(m => m.Status === 'IDLE_PRIORITY' || m.Status === 'IDLE_NO_STAFF');
    const activeMachines = machines.filter(m => m.Status === 'ACTIVE');

    return (
        <main className="min-h-screen p-6 relative">
            <div className="max-w-[1600px] mx-auto">
                <Header onScan={handleScan} isScanning={isScanning} currentProgress={searchProgress} />

                {/* Search Status Toast */}
                <AnimatePresence>
                    {searchStatus.status !== 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-md max-w-md ${searchStatus.status === 'searching'
                                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                                : searchStatus.status === 'success'
                                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                    : 'bg-red-500/20 border-red-500/30 text-red-400'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {searchStatus.status === 'searching' && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
                                {searchStatus.status === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                                {searchStatus.status === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                <div>
                                    <p className="font-medium">
                                        {searchStatus.status === 'searching' ? 'Поиск...' : searchStatus.message}
                                    </p>
                                    <p className="text-sm opacity-70 truncate mt-1">{searchStatus.query}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <GlassCard key={stat.label} hover={false} className="!p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                                        <p className="text-xs text-white/50">{stat.label}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>

                {/* Main Bento Grid */}
                <div className="bento-grid">
                    {/* Matching Feed - Large */}
                    <GlassCard span={2} rowSpan={2} className="!p-5 overflow-hidden">
                        <MatchingTable />
                    </GlassCard>

                    {/* Idle Machines Priority */}
                    <GlassCard span={2} className="!p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-semibold text-white">Приоритет загрузки</h3>
                            <span className="text-xs text-white/40 ml-2">Простаивающие станки</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {idleMachines.map((machine) => (
                                <MachineCard key={machine.Machine_Name} machine={machine} />
                            ))}
                        </div>
                    </GlassCard>

                    {/* Margin Calculator */}
                    <GlassCard className="!p-5">
                        <MarginCalculator />
                    </GlassCard>

                    {/* R&D Insights */}
                    <GlassCard className="!p-5">
                        <RDInsights />
                    </GlassCard>

                    {/* Active Machines */}
                    <GlassCard span={2} className="!p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Factory className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-white">Активное оборудование</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {activeMachines.map((machine) => (
                                <MachineCard key={machine.Machine_Name} machine={machine} />
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Footer */}
                <footer className="mt-8 text-center text-xs text-white/30">
                    Промышленный Радар v2.0 • ООО «Лабораторные Технологии» • laboff.ru
                </footer>
            </div>
        </main>
    );
}
