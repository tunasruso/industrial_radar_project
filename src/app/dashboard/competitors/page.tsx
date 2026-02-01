'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { Building2, Plus, ExternalLink, TrendingUp, Sparkles, Search, Loader2, Pencil, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Competitor {
    id: number;
    name: string;
    website_url: string;
    description: string;
    country: string;
    created_at: string;
    last_analyzed_at?: string;
    products_analyzed?: number;
}

interface AnalysisResult {
    success: boolean;
    productsFound?: number;
    productsSaved?: number;
    productsAnalyzed?: number;
    averageScore?: number;
    highPotentialCount?: number;
    error?: string;
}

interface AnalysisProgress {
    stage: 'mapping' | 'scraping' | 'extracting' | 'scoring' | 'done' | 'error';
    message: string;
    currentStep: number;
    totalSteps: number;
}

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newCompetitor, setNewCompetitor] = useState({ name: '', website_url: '', description: '', country: 'RU' });

    // Analysis state
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);
    const [analysisLimit, setAnalysisLimit] = useState(50);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showLimitModal, setShowLimitModal] = useState<number | null>(null);

    // Edit website state
    const [editingWebsite, setEditingWebsite] = useState<number | null>(null);
    const [editWebsiteUrl, setEditWebsiteUrl] = useState('');

    // Analysis progress state
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
    const [analyzingCompetitorName, setAnalyzingCompetitorName] = useState('');

    useEffect(() => {
        fetchCompetitors();
    }, []);

    const fetchCompetitors = async () => {
        try {
            const res = await fetch('/api/competitors');
            const data = await res.json();
            setCompetitors(data);
        } catch (error) {
            console.error('Failed to load competitors', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newCompetitor.name) return;
        try {
            const res = await fetch('/api/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCompetitor),
            });
            if (res.ok) {
                setIsAdding(false);
                setNewCompetitor({ name: '', website_url: '', description: '', country: 'RU' });
                fetchCompetitors();
            }
        } catch (error) {
            console.error('Failed to create competitor', error);
        }
    };

    const handleStartEditWebsite = (competitor: Competitor) => {
        setEditingWebsite(competitor.id);
        setEditWebsiteUrl(competitor.website_url || '');
    };

    const handleSaveWebsite = async (competitorId: number) => {
        try {
            const res = await fetch('/api/competitors', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: competitorId, website_url: editWebsiteUrl })
            });
            if (res.ok) {
                setEditingWebsite(null);
                fetchCompetitors();
            }
        } catch (error) {
            console.error('Failed to update website:', error);
        }
    };

    const handleAnalyze = async (competitorId: number) => {
        setShowLimitModal(null);
        setAnalyzingId(competitorId);
        setAnalysisResult(null);

        const comp = competitors.find(c => c.id === competitorId);
        setAnalyzingCompetitorName(comp?.name || '');

        // Simulate progress stages
        setAnalysisProgress({ stage: 'mapping', message: 'Поиск страниц с продукцией...', currentStep: 1, totalSteps: 4 });

        try {
            // Start analysis (this is async, we simulate progress)
            const analyzePromise = fetch('/api/analyze-competitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ competitor_id: competitorId, limit: analysisLimit })
            });

            // Simulate progress updates while waiting
            setTimeout(() => {
                if (analyzingId === competitorId) {
                    setAnalysisProgress({ stage: 'scraping', message: 'Сканирование страниц каталога...', currentStep: 2, totalSteps: 4 });
                }
            }, 3000);

            setTimeout(() => {
                if (analyzingId === competitorId) {
                    setAnalysisProgress({ stage: 'extracting', message: 'Извлечение товаров с помощью AI...', currentStep: 3, totalSteps: 4 });
                }
            }, 8000);

            setTimeout(() => {
                if (analyzingId === competitorId) {
                    setAnalysisProgress({ stage: 'scoring', message: 'Оценка возможности производства...', currentStep: 4, totalSteps: 4 });
                }
            }, 15000);

            const res = await analyzePromise;
            const data = await res.json();

            setAnalysisProgress({
                stage: data.success ? 'done' : 'error',
                message: data.success ? `Найдено ${data.productsFound} товаров!` : (data.error || 'Ошибка'),
                currentStep: 4,
                totalSteps: 4
            });

            setAnalysisResult(data);

            if (data.success) {
                fetchCompetitors();
            }

            // Auto-close modal after 3 seconds on success
            setTimeout(() => {
                setAnalysisProgress(null);
                setAnalyzingId(null);
            }, 3000);

        } catch (error) {
            console.error('Analysis failed:', error);
            setAnalysisProgress({ stage: 'error', message: 'Ошибка анализа', currentStep: 0, totalSteps: 4 });
            setAnalysisResult({ success: false, error: 'Ошибка анализа' });

            setTimeout(() => {
                setAnalysisProgress(null);
                setAnalyzingId(null);
            }, 3000);
        }
    };

    return (
        <>
            {/* Analysis Progress Modal */}
            {analysisProgress && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-2">
                            🔍 Анализ конкурента
                        </h2>
                        <p className="text-white/60 mb-6">{analyzingCompetitorName}</p>

                        {/* Progress Steps */}
                        <div className="space-y-4 mb-6">
                            {[
                                { stage: 'mapping', label: 'Поиск страниц с продукцией', icon: '🗺️' },
                                { stage: 'scraping', label: 'Сканирование каталога', icon: '📄' },
                                { stage: 'extracting', label: 'Извлечение товаров (AI)', icon: '🤖' },
                                { stage: 'scoring', label: 'Оценка производства', icon: '⚙️' }
                            ].map((step, idx) => {
                                const stepNum = idx + 1;
                                const isActive = analysisProgress.currentStep === stepNum && analysisProgress.stage !== 'done' && analysisProgress.stage !== 'error';
                                const isComplete = analysisProgress.currentStep > stepNum || analysisProgress.stage === 'done';
                                const isPending = analysisProgress.currentStep < stepNum;

                                return (
                                    <div key={step.stage} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-amber-500/20 border border-amber-500/40' :
                                        isComplete ? 'bg-green-500/10 border border-green-500/20' :
                                            'bg-white/5 border border-white/10'
                                        }`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isActive ? 'bg-amber-500/30 animate-pulse' :
                                            isComplete ? 'bg-green-500/30' :
                                                'bg-white/10'
                                            }`}>
                                            {isComplete ? '✓' : step.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-medium ${isActive ? 'text-amber-400' :
                                                isComplete ? 'text-green-400' :
                                                    'text-white/40'
                                                }`}>
                                                {step.label}
                                            </p>
                                            {isActive && (
                                                <p className="text-sm text-amber-300/70 mt-1">
                                                    {analysisProgress.message}
                                                </p>
                                            )}
                                        </div>
                                        {isActive && (
                                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Result */}
                        {(analysisProgress.stage === 'done' || analysisProgress.stage === 'error') && (
                            <div className={`p-4 rounded-xl ${analysisProgress.stage === 'done'
                                ? 'bg-green-500/20 border border-green-500/40'
                                : 'bg-red-500/20 border border-red-500/40'
                                }`}>
                                <p className={`font-bold text-lg ${analysisProgress.stage === 'done' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {analysisProgress.stage === 'done' ? '✅ Готово!' : '❌ Ошибка'}
                                </p>
                                <p className="text-white/70 mt-1">
                                    {analysisProgress.message}
                                </p>
                                {analysisResult && analysisResult.success && (
                                    <div className="mt-3 pt-3 border-t border-white/10 text-sm text-white/60">
                                        <p>Средний Score: <span className="text-amber-400 font-bold">{analysisResult.averageScore}/100</span></p>
                                        <p>Высокий потенциал: <span className="text-green-400">{analysisResult.highPotentialCount} товаров</span></p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Close Button */}
                        {(analysisProgress.stage === 'done' || analysisProgress.stage === 'error') && (
                            <button
                                onClick={() => { setAnalysisProgress(null); setAnalyzingId(null); }}
                                className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                            >
                                Закрыть
                            </button>
                        )}
                    </div>
                </div>
            )}

            <main className="min-h-screen p-6 relative">
                <div className="max-w-[1600px] mx-auto">
                    <Header onScan={() => { }} isScanning={false} />

                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Building2 className="w-7 h-7 text-amber-400" />
                                Конкуренты
                            </h1>
                            <p className="text-white/50 text-sm mt-1">Отслеживайте конкурентов и анализируйте возможность производства</p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/dashboard/price-comparison"
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition"
                            >
                                <TrendingUp className="w-5 h-5" />
                                Сравнение цен
                            </Link>
                            <Link
                                href="/dashboard/competitors/import"
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition"
                            >
                                📥
                                Импорт прайса
                            </Link>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition"
                            >
                                <Plus className="w-5 h-5" />
                                Добавить
                            </button>
                        </div>
                    </div>

                    {/* Analysis Result Toast */}
                    {analysisResult && (
                        <div className={`mb-4 p-4 rounded-xl border ${analysisResult.success
                            ? 'bg-green-900/30 border-green-700'
                            : 'bg-red-900/30 border-red-700'
                            }`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    {analysisResult.success ? (
                                        <>
                                            <p className="text-green-400 font-semibold">✅ Анализ завершён!</p>
                                            <p className="text-white/70 text-sm mt-1">
                                                Найдено: {analysisResult.productsFound} товаров |
                                                Проанализировано: {analysisResult.productsAnalyzed} |
                                                Средний Score: <span className="text-amber-400 font-bold">{analysisResult.averageScore}/100</span> |
                                                Высокий потенциал: <span className="text-green-400">{analysisResult.highPotentialCount}</span>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-red-400">❌ {analysisResult.error}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setAnalysisResult(null)}
                                    className="text-white/40 hover:text-white"
                                >✕</button>
                            </div>
                        </div>
                    )}

                    {/* Limit Modal */}
                    {showLimitModal !== null && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                            <GlassCard className="!p-6 max-w-md w-full mx-4">
                                <h3 className="text-lg font-bold text-white mb-4">🔍 Настройка анализа</h3>
                                <p className="text-white/60 text-sm mb-4">
                                    Укажите лимит товаров для анализа. Это ограничит расход токенов Firecrawl и LLM.
                                </p>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-2">Лимит товаров</label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={500}
                                        value={analysisLimit}
                                        onChange={e => setAnalysisLimit(parseInt(e.target.value) || 50)}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Рекомендуется: 50-100. Максимум: 500.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAnalyze(showLimitModal)}
                                        className="flex-1 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 font-semibold"
                                    >
                                        🚀 Запустить анализ
                                    </button>
                                    <button
                                        onClick={() => setShowLimitModal(null)}
                                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {isAdding && (
                        <GlassCard className="mb-6 !p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Новый конкурент</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <input
                                    placeholder="Название компании"
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                    value={newCompetitor.name}
                                    onChange={e => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                                />
                                <input
                                    placeholder="https://example.com"
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                    value={newCompetitor.website_url}
                                    onChange={e => setNewCompetitor({ ...newCompetitor, website_url: e.target.value })}
                                />
                                <input
                                    placeholder="Описание"
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                    value={newCompetitor.description}
                                    onChange={e => setNewCompetitor({ ...newCompetitor, description: e.target.value })}
                                />
                                <select
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                    value={newCompetitor.country}
                                    onChange={e => setNewCompetitor({ ...newCompetitor, country: e.target.value })}
                                >
                                    <option value="RU">🇷🇺 Россия</option>
                                    <option value="DE">🇩🇪 Германия</option>
                                    <option value="US">🇺🇸 США</option>
                                    <option value="CN">🇨🇳 Китай</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSave} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                                    Сохранить
                                </button>
                                <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                                    Отмена
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {competitors.map(competitor => (
                            <GlassCard key={competitor.id} className="!p-5 h-full">
                                <div className="flex items-start justify-between mb-3">
                                    <Link href={`/dashboard/competitors/${competitor.id}`} className="flex-1">
                                        <h3 className="font-bold text-lg text-white hover:text-cyan-400 transition">{competitor.name}</h3>
                                        <p className="text-white/50 text-sm">{competitor.description}</p>
                                    </Link>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded">
                                        {competitor.country === 'RU' ? '🇷🇺' : competitor.country === 'DE' ? '🇩🇪' : competitor.country === 'US' ? '🇺🇸' : '🌍'}
                                    </span>
                                </div>

                                {/* Analysis Stats */}
                                {competitor.products_analyzed && competitor.products_analyzed > 0 && (
                                    <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-xs text-amber-400">
                                            📊 Проанализировано: {competitor.products_analyzed} товаров
                                        </p>
                                        {competitor.last_analyzed_at && (
                                            <p className="text-xs text-white/40 mt-1">
                                                {new Date(competitor.last_analyzed_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-4 gap-2">
                                    {/* Analyze Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowLimitModal(competitor.id);
                                        }}
                                        disabled={analyzingId === competitor.id || !competitor.website_url}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${analyzingId === competitor.id
                                            ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                                            : competitor.website_url
                                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                                                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {analyzingId === competitor.id ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Анализ...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4" />
                                                Анализ
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-white/60">
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                        </div>

                                        {editingWebsite === competitor.id ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={editWebsiteUrl}
                                                    onChange={e => setEditWebsiteUrl(e.target.value)}
                                                    className="w-40 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                                                    placeholder="https://..."
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleSaveWebsite(competitor.id); }}
                                                    className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setEditingWebsite(null); }}
                                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleStartEditWebsite(competitor); }}
                                                    className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                                    title="Редактировать сайт"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                {competitor.website_url && (
                                                    <a
                                                        href={competitor.website_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex items-center gap-1 text-cyan-400 text-sm hover:underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Сайт
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>
                        ))}

                        {!loading && competitors.length === 0 && (
                            <div className="col-span-full text-center text-white/30 py-10">
                                Конкуренты не добавлены
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

