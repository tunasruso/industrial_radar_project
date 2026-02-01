'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { Upload, Camera, Loader2, CheckCircle, AlertTriangle, Settings, ChevronRight } from 'lucide-react';
import { Machine } from '@/components/MachineCard';
import Link from 'next/link';

interface ExtendedMachine extends Machine {
    id: number;
}

export default function VisualSearchPage() {
    const [image, setImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [machines, setMachines] = useState<ExtendedMachine[]>([]);
    const [matchedMachines, setMatchedMachines] = useState<ExtendedMachine[]>([]);

    useEffect(() => {
        fetch('/api/machines')
            .then(res => res.json())
            .then(data => {
                const mapped: ExtendedMachine[] = data.map((m: any) => ({
                    id: m.id,
                    Machine_Name: m.name,
                    Type: m.type,
                    Materials: m.materials?.join(', ') || '',
                    Max_Pressure_MPa: m.max_pressure || 0,
                    Hourly_Rate_RUB: m.hourly_rate || 0,
                    Status: m.status || 'ACTIVE'
                }));
                setMachines(mapped);
            })
            .catch(err => console.error('Failed to load machines', err));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImage(base64);
            analyzeImage(base64);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async (base64: string) => {
        setIsAnalyzing(true);
        setAnalysis(null);
        setMatchedMachines([]);

        try {
            const res = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
            });
            const data = await res.json();
            setAnalysis(data);

            // Match machines
            if (data.processes && Array.isArray(data.processes)) {
                const requiredProcesses: string[] = data.processes.map((p: string) => p.toLowerCase());

                const matches = machines.filter(m => {
                    const machineName = m.Machine_Name.toLowerCase();
                    const machineType = m.Type.toLowerCase();

                    // Simple keyword matching logic
                    return requiredProcesses.some(req =>
                        machineName.includes(req) ||
                        machineType.includes(req) ||
                        (req.includes('токар') && (machineType.includes('turning') || machineType.includes('lathe'))) ||
                        (req.includes('фрез') && (machineType.includes('milling'))) ||
                        (req.includes('резка') && machineType.includes('laser'))
                    );
                });
                setMatchedMachines(matches);
            }

        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <main className="min-h-screen p-6 relative">
            <div className="fixed inset-0 bg-[#0a0a0a] z-[-1]" />
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 z-[-1]" />

            <div className="max-w-6xl mx-auto">
                <Header onScan={() => { }} isScanning={false} />

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        Visual Match
                    </h1>
                    <p className="text-white/50">Поиск производственных возможностей по изображению (чертеж/деталь)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Upload */}
                    <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-white/10 hover:border-purple-500/50 transition relative overflow-hidden group">
                        {image ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={image} alt="Preview" className="max-h-[300px] rounded-lg shadow-2xl" />
                                <button
                                    onClick={() => setImage(null)}
                                    className="absolute top-0 right-0 p-2 bg-black/50 text-white hover:bg-red-500 rounded-full transition"
                                >
                                    ✕
                                </button>
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                        <p className="text-purple-300 font-mono animate-pulse">Scanning geometry...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4 w-full h-full justify-center">
                                <div className="p-6 bg-purple-500/10 rounded-full group-hover:scale-110 transition duration-500">
                                    <Camera className="w-12 h-12 text-purple-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-white mb-2">Загрузите фото или чертеж</h3>
                                    <p className="text-white/40 text-sm max-w-[300px]">AI проанализирует деталь и подберет оборудование</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </GlassCard>

                    {/* Right: Results */}
                    <div className="space-y-6">
                        {analysis ? (
                            <>
                                {/* Analysis Result */}
                                <GlassCard className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{analysis.name}</h2>
                                            <div className="flex gap-2 mt-2">
                                                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">{analysis.material}</span>
                                                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">Сложность: {analysis.complexity}/10</span>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-purple-400 text-sm font-bold uppercase mb-2">Операции</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.processes?.map((p: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-white/50 text-sm font-bold uppercase mb-2">Особенности</h4>
                                            <p className="text-white/80 text-sm">{analysis.features}</p>
                                        </div>

                                        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                            <div className="flex gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                                <p className="text-amber-200 text-xs">{analysis.manufacturing_advice}</p>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Matched Machines */}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-cyan-400" />
                                        Подходящее оборудование ({matchedMachines.length})
                                    </h3>

                                    <div className="space-y-3">
                                        {matchedMachines.length > 0 ? matchedMachines.map(machine => (
                                            <div key={machine.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/10 transition">
                                                <div>
                                                    <h4 className="font-bold text-white">{machine.Machine_Name}</h4>
                                                    <p className="text-xs text-white/50">{machine.Type}</p>
                                                </div>
                                                <Link href={`/dashboard/machines?id=${machine.id}`} className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        )) : (
                                            <div className="text-white/40 text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                Нет точных совпадений по оборудованию.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            !isAnalyzing && (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl p-8">
                                    <Camera className="w-16 h-16 mb-4 opacity-50" />
                                    <p>Ожидание загрузки изображения...</p>
                                </div>
                            )
                        )}

                        {isAnalyzing && !analysis && (
                            <div className="space-y-4">
                                <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
                                <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
                                <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
