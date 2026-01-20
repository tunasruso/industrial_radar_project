'use client';

import { StatusBadge } from './StatusBadge';
import { Cpu, Zap } from 'lucide-react';

export interface Machine {
    Machine_Name: string;
    Type: string;
    Materials: string;
    Max_Pressure_MPa: number;
    Hourly_Rate_RUB: number;
    Status: 'IDLE_PRIORITY' | 'IDLE_NO_STAFF' | 'ACTIVE' | 'RISK';
}

interface MachineCardProps {
    machine: Machine;
}

const typeIcons: Record<string, string> = {
    Laser_Cutter: '✂️',
    Engraver: '🔠',
    'Engraver/CNC': '🎯',
    Electric_Oven: '🔥',
    Welder: '⚡',
    Coating: '🧪',
    Milling: '⚙️',
    Turning: '🔩',
    Cutting: '🪚',
    Grinding: '💎',
    Sheet_Metal: '📐',
    Drilling: '🔧',
    Press: '🏋️',
    Induction: '🌡️',
    Special_Machinery: '🏭',
};

export function MachineCard({ machine }: MachineCardProps) {
    const icon = typeIcons[machine.Type] || '⚙️';
    const isIdle = machine.Status.includes('IDLE');

    return (
        <div className={`
      p-4 rounded-xl border transition-all duration-300
      ${isIdle
                ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }
    `}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <div>
                        <h4 className="font-medium text-white text-sm">{machine.Machine_Name}</h4>
                        <p className="text-xs text-white/40">{machine.Type.replace(/_/g, ' ')}</p>
                    </div>
                </div>
                <StatusBadge status={machine.Status} size="sm" />
            </div>

            <div className="flex items-center gap-4 text-xs text-white/50">
                <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>{machine.Hourly_Rate_RUB} ₽/ч</span>
                </div>
                {machine.Max_Pressure_MPa > 0 && (
                    <div className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        <span>{machine.Max_Pressure_MPa} МПа</span>
                    </div>
                )}
            </div>
        </div>
    );
}
