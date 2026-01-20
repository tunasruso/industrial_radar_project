interface StatusBadgeProps {
    status: 'IDLE_PRIORITY' | 'IDLE_NO_STAFF' | 'ACTIVE' | 'RISK' | 'REJECTED';
    size?: 'sm' | 'md';
}

const statusConfig = {
    IDLE_PRIORITY: { label: 'Простой', className: 'status-idle' },
    IDLE_NO_STAFF: { label: 'Нет персонала', className: 'status-warning' },
    ACTIVE: { label: 'Работает', className: 'status-active' },
    RISK: { label: 'Риск', className: 'status-risk' },
    REJECTED: { label: 'Отклонено', className: 'status-risk' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.ACTIVE;
    const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

    return (
        <span className={`
      inline-flex items-center rounded-full font-medium
      ${config.className} ${sizeClass}
    `}>
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
            {config.label}
        </span>
    );
}
