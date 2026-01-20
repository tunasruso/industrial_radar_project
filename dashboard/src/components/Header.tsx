'use client';

import { Radar, PlayCircle, Settings, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    onScan?: () => void;
    isScanning?: boolean;
}

export function Header({ onScan, isScanning = false }: HeaderProps) {
    const pathname = usePathname();
    const isArchive = pathname === '/dashboard/archive';

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
                            onClick={onScan}
                            disabled={isScanning}
                            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
                transition-all duration-300
                ${isScanning
                                    ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
                                    : 'bg-cyan-500 text-black hover:bg-cyan-400'
                                }
              `}
                        >
                            <PlayCircle className="w-5 h-5" />
                            {isScanning ? 'Сканирование...' : 'Запустить поиск'}
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
