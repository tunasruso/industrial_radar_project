'use client';

import { Radar, PlayCircle, Settings, Database, Loader2, BookOpen, Search, Hash, Globe, Camera, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
    onScan: (mode: 'tender' | 'catalog' | 'competitor', count: number, country: string) => void;
    isScanning: boolean;
    currentProgress?: { current: number; total: number };
}

const COUNTRIES = [
    { code: 'RU', name: 'РФ', text: 'Россия' },
    { code: 'KZ', name: 'Казахстан', text: 'Казахстан' },
    { code: 'KG', name: 'Киргизстан', text: 'Киргизстан' },
    { code: 'UZ', name: 'Узбекистан', text: 'Узбекистан' },
    { code: 'BY', name: 'Беларусь', text: 'Беларусь' },
];

export function Header({ onScan, isScanning, currentProgress }: HeaderProps) {
    const pathname = usePathname();
    const isArchive = pathname === '/dashboard/archive';
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [scanMode, setScanMode] = useState<'tender' | 'catalog' | 'competitor'>('tender');
    const [searchCount, setSearchCount] = useState(5);

    return (
        <header className="glass-card mb-6 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <motion.div
                        animate={{ rotate: isScanning ? 360 : 0 }}
                        transition={{ duration: 2, repeat: isScanning ? Infinity : 0, ease: 'linear' }}
                        className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
                    >
                        <Radar className="w-8 h-8 text-cyan-400" />
                    </motion.div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Промышленный Радар</h1>
                        <p className="text-sm text-white/50">Лабораторные Технологии • laboff.ru</p>
                    </div>
                </Link>

                {/* Navigation & Actions */}
                <div className="flex items-center gap-2 flex-wrap justify-end flex-1 ml-4">

                    {/* Machines Link */}
                    <Link
                        href="/dashboard/machines"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/machines' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <Settings className="w-4 h-4" />
                        Станки
                    </Link>


                    {/* Assistant Link */}
                    <Link
                        href="/dashboard/assistant"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/assistant' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Bot className="w-4 h-4" />
                        Ассистент
                    </Link>

                    {/* Competitors Link */}
                    <Link
                        href="/dashboard/competitors"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname?.startsWith('/dashboard/competitors') ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Конкуренты
                    </Link>

                    {/* Price List Link */}
                    <Link
                        href="/dashboard/price-list"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/price-list' ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:text-white'}`}
                    >
                        📋
                        Прайс
                    </Link>

                    {/* Price Report Link */}
                    <Link
                        href="/dashboard/price-report"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/price-report' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}
                    >
                        📊
                        Сравнение
                    </Link>

                    {/* Visual Match Link */}
                    <Link
                        href="/dashboard/visual-search"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/visual-search' ? 'bg-pink-500/20 text-pink-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Camera className="w-4 h-4" />
                        Visual Match
                    </Link>

                    {/* Mode Selector */}
                    {!isArchive && (
                        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                            <button
                                onClick={() => setScanMode('tender')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${scanMode === 'tender' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                <Search className="w-4 h-4" />
                                Тендеры
                            </button>
                            <button
                                onClick={() => setScanMode('catalog')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${scanMode === 'catalog' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                <BookOpen className="w-4 h-4" />
                                Каталоги
                            </button>
                            <button
                                onClick={() => setScanMode('competitor')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${scanMode === 'competitor' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                <Globe className="w-4 h-4" />
                                Конкуренты
                            </button>
                        </div>
                    )}

                    {/* Country Selector */}
                    <div className="flex items-center bg-white/5 rounded-xl px-3 border border-white/10">
                        <span className="text-lg mr-2">🌍</span>
                        <select
                            value={selectedCountry.code}
                            onChange={(e) => setSelectedCountry(COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0])}
                            className="bg-transparent text-white text-sm py-2 outline-none cursor-pointer [&>option]:bg-[#0f172a]"
                        >
                            {COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <Link
                        href={isArchive ? '/dashboard' : '/dashboard/archive'}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-xl transition-all
              ${isArchive
                                ? 'bg-white/10 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }
            `}
                    >
                        {isArchive ? <Radar className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                        {isArchive ? 'Дашборд' : 'Архив'}
                    </Link>

                    {!isArchive && (
                        <>
                            {/* Search Count Input */}
                            <div className="flex items-center bg-white/5 rounded-xl px-3 border border-white/10">
                                <Hash className="w-4 h-4 text-white/40 mr-2" />
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={searchCount}
                                    onChange={(e) => setSearchCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="bg-transparent text-white text-sm py-2 w-12 outline-none text-center"
                                    disabled={isScanning}
                                />
                                <span className="text-white/40 text-xs">запросов</span>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onScan(scanMode, searchCount, selectedCountry.text)}
                                disabled={isScanning}
                                className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
                    transition-all duration-300
                    ${isScanning
                                        ? 'bg-white/10 text-white/50 cursor-wait'
                                        : scanMode === 'tender'
                                            ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                                            : scanMode === 'competitor'
                                                ? 'bg-amber-500 text-black hover:bg-amber-400'
                                                : 'bg-purple-500 text-white hover:bg-purple-400'
                                    }
                  `}
                            >
                                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                                {isScanning && currentProgress
                                    ? `${currentProgress.current}/${currentProgress.total}`
                                    : scanMode === 'tender' ? 'Найти тендеры'
                                        : scanMode === 'catalog' ? 'Сканировать Каталог'
                                            : 'Поиск Конкурентов'}
                            </motion.button>
                        </>
                    )}

                    <button className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {isScanning && currentProgress && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Поиск {currentProgress.current} из {currentProgress.total}</span>
                        <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            )}
        </header>
    );
}
