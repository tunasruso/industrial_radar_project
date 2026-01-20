'use server';

import { tavily } from '@tavily/core';
import { createClient } from '@supabase/supabase-js';

// Используем публичный URL и ANON KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Простая эвристика возможностей производства
function analyzeFeasibility(text: string): { verdict: string, score: number } {
    const textLower = text.toLowerCase();

    // 1. Риски
    const forbiddenMaterials = ['titanium', 'титан', 'glass lined', 'эмалирован', 'эмаль', 'tantalum', 'тантал'];
    for (const m of forbiddenMaterials) {
        if (textLower.includes(m)) return {
            verdict: `### ⚠️ Анализ производства: Требует проверки\n\n**Риски:** Найден сложный материал: ${m}.`,
            score: 40
        };
    }

    if (textLower.includes('high pressure') || textLower.includes('высокое давление') || textLower.includes('bar')) {
        return {
            verdict: '### ⚠️ Анализ производства: Высокое давление. Требует сертификации.',
            score: 60
        };
    }

    // 2. Позитивные сигналы
    const positiveSignals = ['steel', 'сталь', '316', '304', 'ptfe', 'полипропилен', 'reactor', 'реактор'];
    const foundPositives = positiveSignals.filter(s => textLower.includes(s));

    if (foundPositives.length > 0) {
        return {
            verdict: `### ✅ Анализ производства: Подходит\n\n**Обоснование:** Найдены материалы/оборудование (${foundPositives.slice(0, 3).join(', ')}).`,
            score: 95
        };
    }

    return {
        verdict: `### ℹ️ Анализ производства: Недостаточно данных\n\nТребуется запрос КД.`,
        score: 75
    };
}

export async function runResearchAction(query: string) {
    try {
        console.log(`Starting research for: ${query}`);

        // 1. Поиск через Tavily
        const response = await tavilyClient.search(query, {
            searchDepth: "advanced",
            maxResults: 3
        });

        const results = response.results;
        if (!results || results.length === 0) {
            return { success: false, message: "No results found" };
        }

        // 2. Формирование контента (Markdown)
        let fullTextForAnalysis = "";
        let content = `# Отчет по запросу: ${query}\n\n`;

        for (const res of results) {
            content += `### [${res.title}](${res.url})\n\n${res.content.slice(0, 800)}...\n\n---\n`;
            fullTextForAnalysis += `${res.title} ${res.content} `;
        }

        // 3. Анализ (Эвристика)
        const analysis = analyzeFeasibility(fullTextForAnalysis);
        content += `\n\n---\n${analysis.verdict}`;

        // 4. Сохранение отчета в research_reports
        const { error: rrError } = await supabase
            .from('research_reports')
            .insert({
                query: query,
                title: results[0].title,
                content: content,
                url: results[0].url
            });

        if (rrError) console.error("Research insert error:", rrError);

        // 5. [NEW] Генерация записи в Matching Results
        // Если оценка высокая, добавляем "найденный" продукт в фид
        if (analysis.score >= 60) {
            const article = `TND-${Math.floor(Math.random() * 1000)}`;
            const price = Math.floor(Math.random() * 500000) + 50000;

            await supabase
                .from('matching_results')
                .insert({
                    article: article,
                    product_name: results[0].title.slice(0, 100), // Обрезаем если слишком длинное
                    confidence_score: analysis.score,
                    estimated_cost: price, // Фейковая цена для примера
                    category: 'Tender / R&D',
                    material: 'Unknown'
                });
            console.log("Added to matching_results");
        }

        return { success: true, resultsCount: results.length };

    } catch (error) {
        console.error("Research action error:", error);
        return { success: false, message: "Internal Error" };
    }
}
