'use client';

import { useState, useEffect } from 'react';

interface Product {
    id: number;
    category: string;
    name: string;
    price_vat: number;
    created_at: string;
}

interface ProductFormData {
    category: string;
    name: string;
    price_vat: number;
}

export default function PriceListPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>({
        category: '',
        name: '',
        price_vat: 0
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/our-products');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const groupedProducts = filteredProducts.reduce((acc, product) => {
        if (!acc[product.category]) {
            acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    const handleAdd = () => {
        setEditingProduct(null);
        setFormData({ category: '', name: '', price_vat: 0 });
        setShowModal(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            category: product.category,
            name: product.name,
            price_vat: product.price_vat
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить товар?')) return;
        try {
            await fetch(`/api/our-products?id=${id}`, { method: 'DELETE' });
            fetchProducts();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingProduct) {
                await fetch('/api/our-products', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingProduct.id, ...formData })
                });
            } else {
                await fetch('/api/our-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }
            setShowModal(false);
            fetchProducts();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setSaving(false);
        }
    };

    const totalValue = products.reduce((sum, p) => sum + p.price_vat, 0);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        📋 Прайс-лист ЛабТех
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {products.length} товаров • {categories.length - 1} категорий
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
                >
                    <span>+</span> Добавить товар
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-3xl font-bold text-cyan-400">{products.length}</div>
                    <div className="text-gray-400 text-sm">Всего товаров</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-3xl font-bold text-green-400">{categories.length - 1}</div>
                    <div className="text-gray-400 text-sm">Категорий</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-2xl font-bold text-amber-400">
                        {formatPrice(Math.min(...products.map(p => p.price_vat)))}
                    </div>
                    <div className="text-gray-400 text-sm">Мин. цена</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-400">
                        {formatPrice(Math.max(...products.map(p => p.price_vat)))}
                    </div>
                    <div className="text-gray-400 text-sm">Макс. цена</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Поиск по названию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
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
            </div>

            {/* Products by Category */}
            <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                    <div key={category} className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
                        <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                📦 {category}
                                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
                                    {categoryProducts.length}
                                </span>
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-700/50">
                            {categoryProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition-colors">
                                    <div className="flex-1">
                                        <div className="text-white">{product.name}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-lg font-semibold text-green-400 min-w-[120px] text-right">
                                            {formatPrice(product.price_vat)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                                                title="Редактировать"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Удалить"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Товары не найдены
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white">
                                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Категория</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    list="categories"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                                    required
                                />
                                <datalist id="categories">
                                    {categories.filter(c => c !== 'all').map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Название товара *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Цена с НДС (₽) *</label>
                                <input
                                    type="number"
                                    value={formData.price_vat}
                                    onChange={(e) => setFormData({ ...formData, price_vat: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
