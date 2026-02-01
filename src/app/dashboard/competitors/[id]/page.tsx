'use client';

import { useState, useEffect, use } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { ArrowLeft, Plus, ExternalLink, Sparkles, Link as LinkIcon, Brain, X, RefreshCw, TrendingUp, FileText, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

interface CompetitorProduct {
    id: number;
    name: string;
    price: number | null;
    url: string | null;
    notes: string | null;
    found_at: string;
    feasibility_score?: number;
    matching_machines?: string[];
    analysis_notes?: string | null;
    our_product?: {
        name: string;
        price: number;
    } | null;
}

export default function CompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [competitor, setCompetitor] = useState<any>(null);
    const [products, setProducts] = useState<CompetitorProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', url: '', notes: '' });

    // Filter & Pagination
    const [filter, setFilter] = useState<'all' | 'high_potential' | 'unanalyzed'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Selected opinion modal
    const [selectedNote, setSelectedNote] = useState<{ title: string, content: string, score: number } | null>(null);

    // Price History
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [isDeepScanning, setIsDeepScanning] = useState(false);
    const [historyData, setHistoryData] = useState<any[] | null>(null);
    const [historyProductName, setHistoryProductName] = useState<string | null>(null);

    // Sales Quote
    const [quoteProduct, setQuoteProduct] = useState<CompetitorProduct | null>(null);
    const [quoteData, setQuoteData] = useState<{ subject: string, intro: string, value_prop: string, closing: string, estimated_price: string } | null>(null);
    const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

    // New Feature: Target URL
    const [targetUrl, setTargetUrl] = useState('');


    useEffect(() => {
        fetchProducts();
    }, [id]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/api/competitors/${id}/products`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts(data.products || []);
                setCompetitor(data.competitor);
            }
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newProduct.name) return;
        try {
            const res = await fetch(`/api/competitors/${id}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: newProduct.price ? parseFloat(newProduct.price) : null,
                    url: newProduct.url || null,
                    notes: newProduct.notes || null
                }),
            });
            if (res.ok) {
                setIsAdding(false);
                setNewProduct({ name: '', price: '', url: '', notes: '' });
                fetchProducts();
            }
        } catch (error) {
            console.error('Failed to add product', error);
        }
    };

    const handleUpdatePrices = async () => {
        setIsUpdatingPrices(true);
        try {
            await fetch(`/api/cron/update-prices?id=${id}`);
            // Could add a toast here
            fetchProducts();
        } catch (error) {
            console.error('Failed to update prices', error);
        } finally {
            setIsUpdatingPrices(false);
        }
    };

    const handleDeepScan = async () => {
        setIsDeepScanning(true);
        try {
            await fetch('/api/analyze-competitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    competitor_id: id,
                    limit: 300,
                    target_url: targetUrl || undefined
                })
            });
            window.location.reload();
        } catch (error) {
            console.error('Deep scan failed', error);
        } finally {
            setIsDeepScanning(false);
        }
    };

    const handleViewHistory = async (product: CompetitorProduct) => {
        setHistoryProductName(product.name);
        setHistoryData(null); // Reset
        try {
            // Include current price as the latest point if needed, or rely on API
            const res = await fetch(`/api/products/${product.id}/history`);
            const data = await res.json();

            // Format data for chart
            const chartData = data.map((d: any) => ({
                date: new Date(d.recorded_at).toLocaleDateString(),
                price: d.price
            }));

            setHistoryData(chartData);
        } catch (error) {
            console.error(error);
            setHistoryData([]);
        }
    };


    const handleOpenQuote = (product: CompetitorProduct) => {
        setQuoteProduct(product);
        setQuoteData(null);
        // Auto-generate if not present
        handleGenerateQuote(product);
    };

    const handleGenerateQuote = async (product: CompetitorProduct) => {
        setIsGeneratingQuote(true);
        try {
            const res = await fetch('/api/generate-quote-pitch', {
                method: 'POST',
                body: JSON.stringify({
                    productName: product.name,
                    competitorName: competitor?.name || 'Конкурент',
                    competitorPrice: product.price,
                    analysisNotes: product.analysis_notes,
                    feasibilityScore: product.feasibility_score || 0
                })
            });
            const data = await res.json();
            setQuoteData(data);
        } catch (error) {
            console.error('Quote generation failed', error);
        } finally {
            setIsGeneratingQuote(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('quote-preview');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`KP_${quoteProduct?.name.slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('PDF export failed', error);
        }
    };

    const isNew = (foundAt: string) => {
        const days = (Date.now() - new Date(foundAt).getTime()) / (1000 * 60 * 60 * 24);
        return days < 7;
    };

    return (
        <main className="min-h-screen p-6 relative">
            <div className="max-w-[1600px] mx-auto">
                <Header onScan={() => { }} isScanning={false} />

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/competitors" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Товары конкурента</h1>
                            <p className="text-white/50 text-sm">ID: {id}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative group">
                            <input
                                placeholder="URL каталога (опционально)..."
                                value={targetUrl}
                                onChange={e => setTargetUrl(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-64 outline-none focus:border-purple-500 transition"
                            />
                            <div className="absolute top-full left-0 mt-2 w-64 p-2 bg-black/90 border border-white/10 rounded-lg text-xs text-white/60 hidden group-focus-within:block pointer-events-none z-10">
                                Вставьте ссылку на конкретную страницу прайс-листа или категории, чтобы проанализировать именно её.
                            </div>
                        </div>

                        <button
                            onClick={handleUpdatePrices}
                            disabled={isUpdatingPrices}
                            className={`flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition ${isUpdatingPrices ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`w-5 h-5 ${isUpdatingPrices ? 'animate-spin' : ''}`} />
                            {isUpdatingPrices ? 'Обновляем...' : 'Обновить цены'}
                        </button>
                        <button
                            onClick={handleDeepScan}
                            disabled={isDeepScanning}
                            className={`flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition ${isDeepScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Sparkles className={`w-5 h-5 ${isDeepScanning ? 'animate-pulse' : ''}`} />
                            {isDeepScanning ? 'Анализируем...' : 'Полный анализ'}
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition"
                    >
                        <Plus className="w-5 h-5" />
                        Добавить товар
                    </button>
                </div>

                {isAdding && (
                    <GlassCard className="mb-6 !p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Новый товар</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <input
                                placeholder="Название товара"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                            <input
                                placeholder="Цена (₽)"
                                type="number"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={newProduct.price}
                                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                            />
                            <input
                                placeholder="URL товара"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={newProduct.url}
                                onChange={e => setNewProduct({ ...newProduct, url: e.target.value })}
                            />
                            <input
                                placeholder="Заметки"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={newProduct.notes}
                                onChange={e => setNewProduct({ ...newProduct, notes: e.target.value })}
                            />
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

                {/* Filters */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => { setFilter('all'); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${filter === 'all'
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Все ({products.length})
                    </button>
                    <button
                        onClick={() => { setFilter('high_potential'); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${filter === 'high_potential'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Высокий потенциал ({products.filter(p => (p.feasibility_score || 0) >= 70).length})
                    </button>
                    <button
                        onClick={() => { setFilter('unanalyzed'); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${filter === 'unanalyzed'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Не проанализировано ({products.filter(p => !p.feasibility_score).length})
                    </button>
                </div>

                <GlassCard className="!p-0 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Товар</th>
                                <th className="text-right p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Цена конкурента</th>
                                <th className="text-right p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Наша цена</th>
                                <th className="text-center p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Мнение</th>
                                <th className="text-center p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Score</th>
                                <th className="text-center p-4 text-white/60 font-medium text-xs uppercase tracking-wider">Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products
                                .filter(p => {
                                    if (filter === 'high_potential') return (p.feasibility_score || 0) >= 70;
                                    if (filter === 'unanalyzed') return !p.feasibility_score;
                                    return true;
                                })
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map(product => {
                                    const score = product.feasibility_score || 0;
                                    const isHighPotential = score >= 70;
                                    const hasMatch = !!product.our_product;

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`border-t border-white/5 transition hover:bg-white/5 ${isHighPotential ? 'bg-green-500/5' : ''
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="font-medium text-white">{product.name}</div>
                                                {product.matching_machines && product.matching_machines.length > 0 && (
                                                    <div className="text-xs text-white/40 mt-1 flex gap-1">
                                                        Станки: {product.matching_machines.join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {product.price ? (
                                                    <button
                                                        onClick={() => handleViewHistory(product)}
                                                        className="group flex items-center justify-end gap-2 w-full hover:text-cyan-400 transition"
                                                    >
                                                        <span className="font-mono text-white group-hover:text-cyan-400">
                                                            {product.price.toLocaleString()} ₽
                                                        </span>
                                                        <TrendingUp className="w-3 h-3 text-white/20 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                                                    </button>
                                                ) : (
                                                    <span className="text-white/20">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {product.our_product ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono text-cyan-400">{product.our_product.price.toLocaleString()} ₽</span>
                                                        {product.price && (
                                                            <span className={`text-xs ${product.price > product.our_product.price ? 'text-green-400' : 'text-red-400'
                                                                }`}>
                                                                {product.price > product.our_product.price ? 'Выгоднее нас' : 'Дороже нас'}
                                                                {' '}({Math.round((product.price - product.our_product.price) / product.our_product.price * 100)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-white/20">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {product.analysis_notes ? (
                                                    <button
                                                        onClick={() => setSelectedNote({
                                                            title: product.name,
                                                            content: product.analysis_notes || '',
                                                            score: product.feasibility_score || 0
                                                        })}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition"
                                                        title="Мнение технолога"
                                                    >
                                                        <Brain className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <span className="text-white/10">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {score > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`font-bold text-lg ${score >= 80 ? 'text-green-400' :
                                                            score >= 50 ? 'text-amber-400' :
                                                                'text-red-400'
                                                            }`}>
                                                            {score}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-white/20">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {product.url && (
                                                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded text-cyan-400">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {isNew(product.found_at) && (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500/20 text-amber-400 rounded-full" title="New">
                                                            <Sparkles className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-white/30">
                                        Товары не добавлены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {products.length > itemsPerPage && (
                        <div className="flex justify-center p-4 border-t border-white/10 gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white"
                            >
                                Назад
                            </button>
                            <span className="px-3 py-1 text-white/60">
                                Стр. {currentPage} из {Math.ceil(products
                                    .filter(p => {
                                        if (filter === 'high_potential') return (p.feasibility_score || 0) >= 70;
                                        if (filter === 'unanalyzed') return !p.feasibility_score;
                                        return true;
                                    }).length / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={currentPage >= Math.ceil(products
                                    .filter(p => {
                                        if (filter === 'high_potential') return (p.feasibility_score || 0) >= 70;
                                        if (filter === 'unanalyzed') return !p.feasibility_score;
                                        return true;
                                    }).length / itemsPerPage)}
                                className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white"
                            >
                                Вперед
                            </button>
                        </div>
                    )}

                </GlassCard>

                {/* Technologist Opinion Modal */}
                {selectedNote && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
                        <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <Brain className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">Мнение технолога</h3>
                                    <p className="text-white/50 text-xs">AI Agent: Technologist v2.0</p>
                                </div>
                            </div>

                            <p className="text-white font-medium mb-4 pr-6">{selectedNote.title}</p>

                            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                                <p className="text-gray-300 leading-relaxed text-sm">
                                    {selectedNote.content}
                                </p>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${selectedNote.score >= 80 ? 'bg-green-500/20 text-green-400' :
                                    selectedNote.score >= 50 ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    Score: {selectedNote.score}/100
                                </div>
                                <button
                                    onClick={() => setSelectedNote(null)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Price History Modal */}
                {historyProductName && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHistoryProductName(null)}>
                        <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setHistoryProductName(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-2">История цен</h3>
                            <p className="text-white/50 mb-6">{historyProductName}</p>

                            <div className="h-[300px] w-full bg-white/5 rounded-xl p-4">
                                {historyData ? (
                                    historyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={historyData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                                <XAxis dataKey="date" stroke="#ffffff40" tick={{ fill: '#ffffff40' }} />
                                                <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff40' }} tickFormatter={(vals) => `${vals.toLocaleString()} ₽`} width={80} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                                    labelStyle={{ color: '#888' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke="#22d3ee"
                                                    strokeWidth={2}
                                                    dot={{ fill: '#22d3ee' }}
                                                    activeDot={{ r: 8 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-white/40">
                                            Нет истории изменений
                                        </div>
                                    )
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Quote Generator Modal */}
                {quoteProduct && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setQuoteProduct(null)}>
                        <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative my-10" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setQuoteProduct(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white z-10"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-cyan-500/20 rounded-xl">
                                    <Sparkles className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Генератор КП</h3>
                                    <p className="text-white/50 text-sm">AI Sales Assistant</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Controls */}
                                <div className="space-y-6">
                                    <div className="glass-panel p-4 rounded-xl border border-white/10">
                                        <h4 className="text-white font-bold mb-2">Исходные данные</h4>
                                        <p className="text-sm text-gray-400">Товар: <span className="text-white">{quoteProduct.name}</span></p>
                                        <p className="text-sm text-gray-400">Цена конкурента: <span className="text-white">{quoteProduct.price?.toLocaleString()} ₽</span></p>
                                        <p className="text-sm text-gray-400">Feasibility: <span className={quoteProduct.feasibility_score && quoteProduct.feasibility_score >= 70 ? "text-green-400" : "text-amber-400"}>{quoteProduct.feasibility_score}%</span></p>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleGenerateQuote(quoteProduct)}
                                            disabled={isGeneratingQuote}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl transition border border-cyan-500/50"
                                        >
                                            <RefreshCw className={`w-5 h-5 ${isGeneratingQuote ? 'animate-spin' : ''}`} />
                                            {isGeneratingQuote ? 'Пишем текст...' : 'Перегенерировать'}
                                        </button>

                                        <button
                                            onClick={handleDownloadPDF}
                                            disabled={!quoteData}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition disabled:opacity-50"
                                        >
                                            <Download className="w-5 h-5" />
                                            Скачать PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Preview */}
                                <div className="bg-white rounded-xl p-8 min-h-[500px] shadow-lg relative" id="quote-preview">
                                    {quoteData ? (
                                        <div className="text-gray-800 font-serif space-y-4">
                                            <div className="border-b-2 border-cyan-600 pb-4 mb-4 flex justify-between items-center">
                                                <h1 className="text-2xl font-bold text-gray-900">LabTech</h1>
                                                <div className="text-right text-xs text-gray-500">
                                                    Коммерческое предложение<br />
                                                    {new Date().toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h2 className="text-lg font-bold mb-1">{quoteData.subject}</h2>
                                            </div>

                                            <p className="text-sm leading-relaxed mb-4 whitespace-pre-line">{quoteData.intro}</p>

                                            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-cyan-500 my-6">
                                                <h3 className="font-bold text-gray-900 mb-2">Наше решение:</h3>
                                                <p className="text-sm whitespace-pre-line">{quoteData.value_prop}</p>
                                                {quoteData.estimated_price && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 font-bold text-lg text-cyan-700">
                                                        Предложение: {quoteData.estimated_price}
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-sm leading-relaxed whitespace-pre-line">{quoteData.closing}</p>

                                            <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
                                                ООО "ЛабТех" • laboff.ru • +7 (XXX) XXX-XX-XX
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                            {isGeneratingQuote ? (
                                                <>
                                                    <RefreshCw className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
                                                    <p>ИИ пишет предложение...</p>
                                                </>
                                            ) : (
                                                <p>Нажмите "Сгенерировать"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
