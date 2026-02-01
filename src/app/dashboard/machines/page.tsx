'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { Plus, Save, X, Power, Settings, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';

interface Machine {
    id: string;
    code: string;
    name: string;
    type: string;
    brand_model: string;
    purpose: string;
    specifications: string;
    capabilities: string;
    notes: string;
    status: 'ACTIVE' | 'IDLE_PRIORITY' | 'IDLE_NO_STAFF' | 'MAINTENANCE';
}

const statusConfig: Record<Machine['status'], { label: string; bgColor: string; borderColor: string; textColor: string }> = {
    'ACTIVE': { label: 'В работе', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
    'IDLE_PRIORITY': { label: 'Приоритет', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-400' },
    'IDLE_NO_STAFF': { label: 'Нет персонала', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', textColor: 'text-amber-400' },
    'MAINTENANCE': { label: 'ТО/Ремонт', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', textColor: 'text-red-400' }
};

const emptyMachine: Partial<Machine> = {
    status: 'IDLE_PRIORITY',
    code: '',
    name: '',
    type: '',
    brand_model: '',
    purpose: '',
    specifications: '',
    capabilities: '',
    notes: ''
};

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Partial<Machine>>(emptyMachine);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        try {
            const res = await fetch('/api/machines');
            const data = await res.json();
            setMachines(data);
        } catch (error) {
            console.error('Failed to load machines', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingMachine.name || !editingMachine.type) return;

        const method = editingMachine.id ? 'PUT' : 'POST';
        try {
            const res = await fetch('/api/machines', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMachine),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setEditingMachine(emptyMachine);
                fetchMachines();
            }
        } catch (error) {
            console.error('Failed to save machine', error);
        }
    };

    const cycleStatus = async (machine: Machine) => {
        const statusOrder: Machine['status'][] = ['ACTIVE', 'IDLE_PRIORITY', 'IDLE_NO_STAFF', 'MAINTENANCE'];
        const currentIndex = statusOrder.indexOf(machine.status);
        const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
        try {
            const res = await fetch('/api/machines', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: machine.id, status: newStatus }),
            });
            if (res.ok) {
                fetchMachines();
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const openEdit = (machine: Machine) => {
        setEditingMachine({ ...machine });
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingMachine(emptyMachine);
        setIsModalOpen(true);
    };

    const uniqueTypes = ['all', ...new Set(machines.map(m => m.type))];
    const filteredMachines = filterType === 'all'
        ? machines
        : machines.filter(m => m.type === filterType);

    const stats = {
        total: machines.length,
        active: machines.filter(m => m.status === 'ACTIVE').length,
        priority: machines.filter(m => m.status === 'IDLE_PRIORITY').length,
        maintenance: machines.filter(m => m.status === 'MAINTENANCE').length
    };

    return (
        <main className="min-h-screen p-6 relative">
            <div className="max-w-[1600px] mx-auto">
                <Header onScan={() => { }} isScanning={false} />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Settings className="w-7 h-7 text-cyan-400" />
                            Управление оборудованием
                        </h1>
                        <p className="text-white/50 text-sm mt-1">22 единицы из stanok_inventory.xlsx</p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Добавить станок
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <GlassCard className="!p-4 text-center">
                        <div className="text-3xl font-bold text-white">{stats.total}</div>
                        <div className="text-white/50 text-sm">Всего</div>
                    </GlassCard>
                    <GlassCard className="!p-4 text-center">
                        <div className="text-3xl font-bold text-green-400">{stats.active}</div>
                        <div className="text-white/50 text-sm">В работе</div>
                    </GlassCard>
                    <GlassCard className="!p-4 text-center">
                        <div className="text-3xl font-bold text-cyan-400">{stats.priority}</div>
                        <div className="text-white/50 text-sm">Приоритет</div>
                    </GlassCard>
                    <GlassCard className="!p-4 text-center">
                        <div className="text-3xl font-bold text-red-400">{stats.maintenance}</div>
                        <div className="text-white/50 text-sm">На ТО</div>
                    </GlassCard>
                </div>

                {/* Filter */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {uniqueTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1 rounded-full text-sm transition ${filterType === type
                                ? 'bg-cyan-500 text-black'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                        >
                            {type === 'all' ? 'Все' : type}
                        </button>
                    ))}
                </div>

                {/* Machines Grid */}
                <div className="grid gap-4">
                    {filteredMachines.map(machine => {
                        const status = statusConfig[machine.status];
                        const isExpanded = expandedId === machine.id;

                        return (
                            <GlassCard key={machine.id} className="!p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-cyan-400 font-mono">
                                                {machine.code}
                                            </span>
                                            <h3 className="font-bold text-lg text-white">{machine.name}</h3>
                                        </div>
                                        <p className="text-white/50 text-sm">{machine.type} • {machine.brand_model}</p>
                                        <p className="text-white/40 text-xs mt-1 line-clamp-1">{machine.purpose}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.borderColor} ${status.textColor}`}>
                                            {status.label}
                                        </div>

                                        <button
                                            onClick={() => cycleStatus(machine)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60 hover:text-white"
                                            title="Переключить статус"
                                        >
                                            <Power className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => openEdit(machine)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60 hover:text-white"
                                            title="Редактировать"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : machine.id)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60 hover:text-white"
                                        >
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-white/10 grid md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-white/40 text-xs uppercase mb-1">Характеристики</h4>
                                            <p className="text-white/80 text-sm">{machine.specifications || '—'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-white/40 text-xs uppercase mb-1">Возможности</h4>
                                            <p className="text-white/80 text-sm">{machine.capabilities || '—'}</p>
                                        </div>
                                        {machine.notes && (
                                            <div className="md:col-span-2">
                                                <h4 className="text-amber-400/60 text-xs uppercase mb-1">Примечания</h4>
                                                <p className="text-amber-400/80 text-sm">{machine.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}

                    {!loading && machines.length === 0 && (
                        <div className="text-center text-white/30 py-10">
                            Список оборудования пуст
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <GlassCard className="!p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingMachine.id ? 'Редактировать станок' : 'Добавить станок'}
                        </h2>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <input
                                placeholder="Код (U01, U02...)"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={editingMachine.code || ''}
                                onChange={e => setEditingMachine({ ...editingMachine, code: e.target.value })}
                            />
                            <input
                                placeholder="Название *"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={editingMachine.name || ''}
                                onChange={e => setEditingMachine({ ...editingMachine, name: e.target.value })}
                            />
                            <input
                                placeholder="Тип (Токарная, Фрезерование...) *"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={editingMachine.type || ''}
                                onChange={e => setEditingMachine({ ...editingMachine, type: e.target.value })}
                            />
                            <input
                                placeholder="Марка/модель"
                                className="bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={editingMachine.brand_model || ''}
                                onChange={e => setEditingMachine({ ...editingMachine, brand_model: e.target.value })}
                            />
                        </div>

                        <textarea
                            placeholder="Назначение (Тип/назначение)"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500 mb-4"
                            value={editingMachine.purpose || ''}
                            onChange={e => setEditingMachine({ ...editingMachine, purpose: e.target.value })}
                        />

                        <textarea
                            placeholder="Характеристики (по фото/шильдику)"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500 mb-4"
                            value={editingMachine.specifications || ''}
                            onChange={e => setEditingMachine({ ...editingMachine, specifications: e.target.value })}
                        />

                        <textarea
                            placeholder="Что может делать (операции)"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500 mb-4"
                            value={editingMachine.capabilities || ''}
                            onChange={e => setEditingMachine({ ...editingMachine, capabilities: e.target.value })}
                        />

                        <textarea
                            placeholder="Примечания / что нужно уточнить"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500 mb-4"
                            value={editingMachine.notes || ''}
                            onChange={e => setEditingMachine({ ...editingMachine, notes: e.target.value })}
                        />

                        <div className="mb-4">
                            <label className="block text-white/50 text-sm mb-2">Статус</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                value={editingMachine.status}
                                onChange={e => setEditingMachine({ ...editingMachine, status: e.target.value as Machine['status'] })}
                            >
                                <option value="ACTIVE" className="bg-slate-800">В работе</option>
                                <option value="IDLE_PRIORITY" className="bg-slate-800">Приоритет</option>
                                <option value="IDLE_NO_STAFF" className="bg-slate-800">Нет персонала</option>
                                <option value="MAINTENANCE" className="bg-slate-800">ТО/Ремонт</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 font-medium"
                            >
                                <Save className="w-4 h-4" /> Сохранить
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </main>
    );
}
