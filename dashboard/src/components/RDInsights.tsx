'use client';

import { FileText, ExternalLink, Beaker, Flame } from 'lucide-react';

const insights = [
    {
        title: 'Кремниевое покрытие',
        description: 'Исследование CVD для химстойкости',
        file: 'silicon_coating_research.md',
        icon: Beaker,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
    },
    {
        title: 'Лазерная сварка',
        description: 'Инструкция FWS-01A для нержавейки',
        file: 'welding_quick_start.md',
        icon: Flame,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
    },
];

export function RDInsights() {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">R&D Инсайты</h3>
            </div>

            {insights.map((item) => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.file}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/10 
                       hover:border-white/20 transition-all cursor-pointer group"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${item.bgColor}`}>
                                <Icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-white text-sm">{item.title}</h4>
                                    <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                                </div>
                                <p className="text-xs text-white/50 mt-1">{item.description}</p>
                            </div>
                        </div>
                    </div>
                );
            })}

            <p className="text-xs text-white/40 text-center mt-4">
                📁 data/output/technical_manuals/
            </p>
        </div>
    );
}
