'use client';

import { Radar, PlayCircle, Settings, Database, Loader2, BookOpen, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
    onScan: (mode: 'tender' | 'catalog') => void;
    isScanning: boolean;
}

const COUNTRIES = [
    { code: 'RU', name: 'РФ', text: 'Россия' },
    { code: 'KZ', name: 'Казахстан', text: 'Казахстан' },
    { code: 'KG', name: 'Киргизстан', text: 'Киргизстан' },
    { code: 'UZ', name: 'Узбекистан', text: 'Узбекистан' }, // Added Uzbekistan
    { code: 'BY', name: 'Беларусь', text: 'Беларусь' },
];

export function Header({ onScan, isScanning }: HeaderProps) {
    const pathname = usePathname();
    const isArchive = pathname === '/dashboard/archive';
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [scanMode, setScanMode] = useState<'tender' | 'catalog'>('tender');

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
                <div className="flex items-center gap-4">

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
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onScan(scanMode)}
                            disabled={isScanning}
                            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
                transition-all duration-300
                ${isScanning
                                    ? 'bg-white/10 text-white/50 cursor-wait'
                                    : scanMode === 'tender'
                                        ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                                        : 'bg-purple-500 text-white hover:bg-purple-400'
                                }
              `}
                        >
                            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                            {isScanning ? 'Сканирование...' : scanMode === 'tender' ? 'Найти тендеры' : 'Сканировать Каталог'}
                        </motion.button>
                    )}

                    <button className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </div>
        </header>
    );
}
