'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    span?: 1 | 2 | 3 | 4;
    rowSpan?: 1 | 2 | 3;
}

export function GlassCard({
    children,
    className = '',
    hover = true,
    span = 1,
    rowSpan = 1
}: GlassCardProps) {
    const spanClass = span > 1 ? `col-span-${span}` : '';
    const rowSpanClass = rowSpan > 1 ? `row-span-${rowSpan}` : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`
        glass-card p-6 
        ${hover ? 'glass-card-hover cursor-pointer' : ''} 
        ${spanClass} ${rowSpanClass}
        ${className}
      `}
            style={{
                gridColumn: span > 1 ? `span ${span}` : undefined,
                gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
            }}
        >
            {children}
        </motion.div>
    );
}
