'use client';

import { Radar, Settings, Database, Globe, Camera, Bot } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
    const pathname = usePathname();
    const isArchive = pathname === '/dashboard/archive';

    return (
        <nav className="glass-card mb-6 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <Radar className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Промышленный Радар</h1>
                        <p className="text-sm text-white/50">Лабораторные Технологии • laboff.ru</p>
                    </div>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-2 flex-wrap justify-end flex-1 ml-4">
                    <Link
                        href="/dashboard/machines"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/machines' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <Settings className="w-4 h-4" />
                        Станки
                    </Link>

                    <Link
                        href="/dashboard/assistant"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/assistant' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Bot className="w-4 h-4" />
                        Ассистент
                    </Link>

                    <Link
                        href="/dashboard/competitors"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname?.startsWith('/dashboard/competitors') ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Конкуренты
                    </Link>

                    <Link
                        href="/dashboard/price-list"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/price-list' ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:text-white'}`}
                    >
                        📋
                        Прайс
                    </Link>

                    <Link
                        href="/dashboard/price-report"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/price-report' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}
                    >
                        📊
                        Сравнение
                    </Link>

                    <Link
                        href="/dashboard/visual-search"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${pathname === '/dashboard/visual-search' ? 'bg-pink-500/20 text-pink-400' : 'text-white/40 hover:text-white'}`}
                    >
                        <Camera className="w-4 h-4" />
                        Visual Match
                    </Link>

                    <Link
                        href={isArchive ? '/dashboard' : '/dashboard/archive'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isArchive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        {isArchive ? <Radar className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                        {isArchive ? 'Дашборд' : 'Архив'}
                    </Link>

                    <button className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
