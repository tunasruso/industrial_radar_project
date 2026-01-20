'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { MachineCard, Machine } from '@/components/MachineCard';
import { MatchingTable } from '@/components/MatchingTable';
import { MarginCalculator } from '@/components/MarginCalculator';
import { RDInsights } from '@/components/RDInsights';
import { Activity, Factory, TrendingUp, Beaker } from 'lucide-react';
import { runResearchAction } from '@/app/actions/research';

// Factory data from factory_specs.csv
const machines: Machine[] = [
    { Machine_Name: 'Lasermann LSS 1325', Type: 'Laser_Cutter', Materials: 'Steel, Aluminum, Wood', Max_Pressure_MPa: 0, Hourly_Rate_RUB: 1000, Status: 'IDLE_PRIORITY' },
    { Machine_Name: 'UVGS-TFS-3008 (U07)', Type: 'Engraver/CNC', Materials: 'Metal, Polymers, Wood', Max_Pressure_MPa: 0, Hourly_Rate_RUB: 1000, Status: 'IDLE_PRIORITY' },
    { Machine_Name: 'Laser Marker (U19)', Type: 'Engraver', Materials: 'Metal, Polymers', Max_Pressure_MPa: 0, Hourly_Rate_RUB: 1000, Status: 'IDLE_PRIORITY' },
    { Machine_Name: 'DM-12NT-CVD-150', Type: 'Electric_Oven', Materials: 'Glass, Metal', Max_Pressure_MPa: 0, Hourly_Rate_RUB: 1000, Status: 'IDLE_PRIORITY' },
    { Machine_Name: 'Laser Welding (U02)', Type: 'Welder', Materials: 'Stainless Steel', Max_Pressure_MPa: 15, Hourly_Rate_RUB: 1000, Status: 'IDLE_NO_STAFF' },
    { Machine_Name: 'Silicon Coating', Type: 'Coating', Materials: 'Labware, Metal', Max_Pressure_MPa: 15, Hourly_Rate_RUB: 1000, Status: 'ACTIVE' },
    { Machine_Name: 'Universal Milling', Type: 'Milling', Materials: '316L, 12X18H10T', Max_Pressure_MPa: 15, Hourly_Rate_RUB: 1000, Status: 'ACTIVE' },
    { Machine_Name: 'Lathes (U09/U10)', Type: 'Turning', Materials: '316L, 12X18H10T', Max_Pressure_MPa: 15, Hourly_Rate_RUB: 1000, Status: 'ACTIVE' },
];

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

export default function DashboardPage() {
    const [isScanning, setIsScanning] = useState(false);

    const handleScan = async (mode: 'tender' | 'catalog') => {
        if (isScanning) return;
        setIsScanning(true);

        try {
            const queries = mode === 'tender' ? TENDER_QUERIES : CATALOG_QUERIES;
            // Выбираем случайный запрос из соответствующей категории
            const randomQuery = queries[Math.floor(Math.random() * queries.length)];

            console.log(`Scanning in ${mode} mode for:`, randomQuery);
            await runResearchAction(randomQuery);
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setIsScanning(false), 2000);
        }
    };

    const idleMachines = machines.filter(m => m.Status.includes('IDLE'));
    const activeMachines = machines.filter(m => m.Status === 'ACTIVE');

    return (
        <main className="min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                <Header onScan={handleScan} isScanning={isScanning} />

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
