'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/NavBar';

interface OurProduct {
    id: number;
    category: string;
    name: string;
    price_vat: number;
}

interface Competitor {
    id: number;
    name: string;
    website: string;
}

interface CompetitorProduct {
    id: number;
    competitor_id: number;
    name: string;
    price: number;
    url?: string;
    our_product_id?: number;
}

interface ComparisonRow {
    ourProduct: OurProduct;
    competitorPrices: {
        competitor: Competitor;
        product?: CompetitorProduct;
        priceDiff?: number;
        priceDiffPercent?: number;
    }[];
}

export default function PriceReportPage() {
    const [ourProducts, setOurProducts] = useState<OurProduct[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [competitorProducts, setCompetitorProducts] = useState<CompetitorProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showOnlyWithCompetitors, setShowOnlyWithCompetitors] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, competitorsRes, compProductsRes] = await Promise.all([
                fetch('/api/our-products'),
                fetch('/api/competitors'),
                fetch('/api/competitor-products')
            ]);

            const products = await productsRes.json();
            const comps = await competitorsRes.json();
            const compProducts = await compProductsRes.json();

            setOurProducts(products || []);
            setCompetitors(comps || []);
            setCompetitorProducts(compProducts || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...Array.from(new Set(ourProducts.map(p => p.category)))];

    const filteredProducts = ourProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Build comparison data
    const comparisonData: ComparisonRow[] = filteredProducts.map(ourProduct => {
        const competitorPrices = competitors.map(competitor => {
            // Find competitor product linked to our product
            const compProduct = competitorProducts.find(
                cp => cp.competitor_id === competitor.id && cp.our_product_id === ourProduct.id
            );

            if (compProduct) {
                const priceDiff = compProduct.price - ourProduct.price_vat;
                const priceDiffPercent = ((compProduct.price - ourProduct.price_vat) / ourProduct.price_vat) * 100;
                return { competitor, product: compProduct, priceDiff, priceDiffPercent };
            }
            return { competitor };
        });

        return { ourProduct, competitorPrices };
    });

    const filteredComparisonData = showOnlyWithCompetitors
        ? comparisonData.filter(row => row.competitorPrices.some(cp => cp.product))
        : comparisonData;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    };

    const formatDiff = (diff: number) => {
        const sign = diff > 0 ? '+' : '';
        return `${sign}${diff.toFixed(1)}%`;
    };

    // Stats
    const totalOurProducts = ourProducts.length;
    const linkedProducts = competitorProducts.filter(cp => cp.our_product_id).length;
    const cheaperThanUs = comparisonData.filter(row =>
        row.competitorPrices.some(cp => cp.priceDiffPercent && cp.priceDiffPercent < 0)
    ).length;
    const moreExpensive = comparisonData.filter(row =>
        row.competitorPrices.some(cp => cp.priceDiffPercent && cp.priceDiffPercent > 0)
    ).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-6 relative">
            <div className="max-w-[1600px] mx-auto">
                <NavBar />
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            📊 Сравнение цен с конкурентами
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Сводный отчёт по ценам ЛабТех и конкурентов
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <div className="text-3xl font-bold text-cyan-400">{totalOurProducts}</div>
                            <div className="text-gray-400 text-sm">Наших товаров</div>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <div className="text-3xl font-bold text-purple-400">{competitors.length}</div>
                            <div className="text-gray-400 text-sm">Конкурентов</div>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <div className="text-3xl font-bold text-blue-400">{linkedProducts}</div>
                            <div className="text-gray-400 text-sm">Связанных товаров</div>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <div className="text-3xl font-bold text-green-400">{cheaperThanUs}</div>
                            <div className="text-gray-400 text-sm">Дешевле у нас</div>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <div className="text-3xl font-bold text-red-400">{moreExpensive}</div>
                            <div className="text-gray-400 text-sm">Дешевле у конкурентов</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Поиск по названию..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="all">Все категории</option>
                            {categories.filter(c => c !== 'all').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOnlyWithCompetitors}
                                onChange={(e) => setShowOnlyWithCompetitors(e.target.checked)}
                                className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                            />
                            Только со сравнением
                        </label>
                    </div>

                    {/* Info message */}
                    {linkedProducts === 0 && (
                        <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
                            <p className="text-amber-400">
                                ⚠️ Пока нет связанных товаров конкурентов. Добавьте товары конкурентов и свяжите их с нашими через LLM-мэтчинг.
                            </p>
                        </div>
                    )}

                    {/* Comparison Table */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-800/50 border-b border-gray-700">
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Категория</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Наш товар</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-cyan-400">Наша цена</th>
                                        {competitors.map(comp => (
                                            <th key={comp.id} className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                                                {comp.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {filteredComparisonData.slice(0, 50).map((row) => (
                                        <tr key={row.ourProduct.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                                {row.ourProduct.category}
                                            </td>
                                            <td className="px-4 py-3 text-white">
                                                {row.ourProduct.name}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-cyan-400">
                                                {formatPrice(row.ourProduct.price_vat)}
                                            </td>
                                            {row.competitorPrices.map((cp, idx) => (
                                                <td key={idx} className="px-4 py-3 text-right">
                                                    {cp.product ? (
                                                        <div>
                                                            <div className="font-medium text-white">
                                                                {formatPrice(cp.product.price)}
                                                            </div>
                                                            <div className={`text-xs ${cp.priceDiffPercent && cp.priceDiffPercent > 0
                                                                ? 'text-green-400'
                                                                : 'text-red-400'
                                                                }`}>
                                                                {cp.priceDiffPercent ? formatDiff(cp.priceDiffPercent) : ''}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredComparisonData.length > 50 && (
                            <div className="px-4 py-3 text-center text-gray-500 bg-gray-800/50 border-t border-gray-700">
                                Показано 50 из {filteredComparisonData.length} товаров
                            </div>
                        )}
                    </div>

                    {filteredComparisonData.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Товары не найдены
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
