'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Competitor {
    id: number;
    name: string;
    website_url: string;
}

export default function ImportCompetitorPricesPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [selectedCompetitor, setSelectedCompetitor] = useState<number | ''>('');
    const [inputMode, setInputMode] = useState<'paste' | 'file'>('file');
    const [pasteData, setPasteData] = useState('');
    const [parsedProducts, setParsedProducts] = useState<Array<{ name: string; price: number }>>([]);
    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; imported?: number; error?: string } | null>(null);

    useEffect(() => {
        fetch('/api/competitors')
            .then(r => r.json())
            .then(data => setCompetitors(data || []));
    }, []);

    const parsePasteData = (text: string): Array<{ name: string; price: number }> => {
        const lines = text.split('\n').filter(line => line.trim());
        const products: Array<{ name: string; price: number }> = [];

        for (const line of lines) {
            let parts = line.split('\t');
            if (parts.length < 2) parts = line.split(';');
            if (parts.length < 2) parts = line.split(',');

            if (parts.length >= 2) {
                const name = parts[0].trim();
                for (let i = 1; i < parts.length; i++) {
                    const priceStr = parts[i].replace(/[^\d.,]/g, '').replace(',', '.');
                    const price = parseFloat(priceStr);
                    if (price && price > 0) {
                        products.push({ name, price });
                        break;
                    }
                }
            }
        }
        return products;
    };

    // Update parsed products when paste data changes
    useEffect(() => {
        if (inputMode === 'paste') {
            setParsedProducts(parsePasteData(pasteData));
        }
    }, [pasteData, inputMode]);

    const handleImport = async () => {
        if (!selectedCompetitor) {
            alert('Выберите конкурента');
            return;
        }

        if (parsedProducts.length === 0) {
            setResult({ error: 'Не найдено товаров для импорта.' });
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const res = await fetch('/api/competitor-products/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    competitor_id: selectedCompetitor,
                    products: parsedProducts
                })
            });

            const data = await res.json();

            if (res.ok) {
                setResult({ success: true, imported: data.imported });
                setPasteData('');
                setParsedProducts([]);
            } else {
                setResult({ error: data.error || 'Ошибка импорта' });
            }
        } catch (error) {
            console.error('Import error:', error);
            setResult({ error: 'Ошибка соединения' });
        } finally {
            setImporting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsing(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/parse-price-file', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.products) {
                setParsedProducts(data.products);
                setResult(null);
            } else {
                setResult({ error: data.error || 'Не удалось разобрать файл' });
                setParsedProducts([]);
            }
        } catch (error) {
            console.error('Parse error:', error);
            setResult({ error: 'Ошибка при чтении файла' });
        } finally {
            setParsing(false);
        }
    };

    const previewProducts = parsedProducts.slice(0, 15);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        📥 Импорт прайса конкурента
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Загрузите прайс-лист из Excel или вставьте данные
                    </p>
                </div>
                <Link
                    href="/dashboard/competitors"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                    ← Назад
                </Link>
            </div>

            {/* Competitor Selection */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <label className="block text-sm text-gray-400 mb-2">Выберите конкурента *</label>
                <select
                    value={selectedCompetitor}
                    onChange={(e) => setSelectedCompetitor(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                    <option value="">-- Выберите конкурента --</option>
                    {competitors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => { setInputMode('file'); setParsedProducts([]); }}
                    className={`px-4 py-2 rounded-lg transition-colors ${inputMode === 'file'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    📄 Загрузить Excel/CSV
                </button>
                <button
                    onClick={() => { setInputMode('paste'); setParsedProducts([]); }}
                    className={`px-4 py-2 rounded-lg transition-colors ${inputMode === 'paste'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    📋 Вставить данные
                </button>
            </div>

            {/* Input Area */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                {inputMode === 'file' ? (
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Загрузите файл (.xls, .xlsx, .csv, .txt)
                        </label>
                        <input
                            type="file"
                            accept=".xls,.xlsx,.csv,.txt"
                            onChange={handleFileUpload}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                        />
                        {parsing && (
                            <p className="text-cyan-400 text-sm mt-2 animate-pulse">
                                ⏳ Разбор файла...
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Вставьте данные из Excel (Название | Цена)
                        </label>
                        <textarea
                            value={pasteData}
                            onChange={(e) => setPasteData(e.target.value)}
                            placeholder="Название товара&#9;12500
Другой товар&#9;34000
..."
                            rows={10}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Формат: Название[TAB или ;]Цена — каждый товар с новой строки
                        </p>
                    </div>
                )}
            </div>

            {/* Preview */}
            {previewProducts.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-green-400 mb-3">
                        ✅ Найдено {parsedProducts.length} товаров (показано {previewProducts.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {previewProducts.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm border-b border-gray-700/50 pb-1">
                                <span className="text-white truncate max-w-[70%]">{p.name}</span>
                                <span className="text-green-400 font-mono">{p.price.toLocaleString('ru-RU')} ₽</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Result Message */}
            {result && (
                <div className={`p-4 rounded-xl ${result.success
                    ? 'bg-green-900/30 border border-green-700 text-green-400'
                    : 'bg-red-900/30 border border-red-700 text-red-400'
                    }`}>
                    {result.success
                        ? `✅ Успешно импортировано ${result.imported} товаров!`
                        : `❌ ${result.error}`}
                </div>
            )}

            {/* Import Button */}
            <button
                onClick={handleImport}
                disabled={importing || !selectedCompetitor || parsedProducts.length === 0}
                className="w-full px-6 py-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white font-semibold transition-colors"
            >
                {importing ? 'Импортирую...' : `Импортировать ${parsedProducts.length} товаров`}
            </button>
        </div>
    );
}
