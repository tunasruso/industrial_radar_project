'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface OurProduct {
    id: number;
    category: string;
    name: string;
    price_vat: number;
}

export default function PriceComparisonPage() {
    const [ourProducts, setOurProducts] = useState<OurProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/our-products');
            const data = await res.json();
            setOurProducts(data);
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(ourProducts.map(p => p.category))];
    const filteredProducts = selectedCategory === 'all'
        ? ourProducts
        : ourProducts.filter(p => p.category === selectedCategory);

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
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="w-7 h-7 text-purple-400" />
                                Сравнение цен
                            </h1>
                            <p className="text-white/50 text-sm mt-1">Наши цены vs. конкуренты</p>
                        </div>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-sm transition ${selectedCategory === cat
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {cat === 'all' ? 'Все категории' : cat}
                        </button>
                    ))}
                </div>

                <GlassCard className="!p-0 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left p-4 text-white/60 font-medium">Категория</th>
                                <th className="text-left p-4 text-white/60 font-medium">Наш товар</th>
                                <th className="text-right p-4 text-white/60 font-medium">Наша цена</th>
                                <th className="text-right p-4 text-white/60 font-medium">Цена конкурента</th>
                                <th className="text-right p-4 text-white/60 font-medium">Δ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                // Placeholder for competitor price (would come from matches in real implementation)
                                const competitorPrice = null;
                                const diff = competitorPrice ? ((competitorPrice - product.price_vat) / product.price_vat * 100) : null;

                                return (
                                    <tr key={product.id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-4 text-white/50 text-sm">{product.category}</td>
                                        <td className="p-4 text-white">{product.name}</td>
                                        <td className="p-4 text-right text-white font-mono">
                                            {product.price_vat.toLocaleString()} ₽
                                        </td>
                                        <td className="p-4 text-right text-white/50 font-mono">
                                            {competitorPrice ? `${competitorPrice.toLocaleString()} ₽` : '—'}
                                        </td>
                                        <td className="p-4 text-right">
                                            {diff !== null ? (
                                                <span className={`inline-flex items-center gap-1 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white/50'
                                                    }`}>
                                                    {diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                                    {Math.abs(diff).toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-white/30">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </GlassCard>

                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <p className="text-purple-300 text-sm">
                        💡 <strong>Подсказка:</strong> Добавьте товары конкурентов и создайте связи (матчи) для автоматического расчета разницы цен.
                    </p>
                </div>
            </div>
        </main>
    );
}
