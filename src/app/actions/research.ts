'use server';

import { tavily } from '@tavily/core';
import { createClient } from '@supabase/supabase-js';

// Используем публичный URL и ANON KEY, так как настроили RLS "Allow anon insert"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Простая эвристика возможностей производства (Factory Capabilities)
function analyzeFeasibility(text: string): string {
    const textLower = text.toLowerCase();

    // 1. Материалы (Пример: мы не работаем с титаном или стеклом)
    const forbiddenMaterials = ['titanium', 'титан', 'glass lined', 'эмалирован', 'эмаль', 'tantalum', 'тантал'];
    const warnings = [];

    for (const m of forbiddenMaterials) {
        if (textLower.includes(m)) warnings.push(`Найден сложный материал: ${m}`);
    }

    // 2. Габариты/Давление
    if (textLower.includes('high pressure') || textLower.includes('высокое давление') || textLower.includes('bar')) {
        warnings.push('Требования к давлению (проверить автоклав)');
    }

    // 3. Позитивные сигналы
    const positiveSignals = ['steel', 'сталь', '316', '304', 'ptfe', 'полипропилен', 'reactor', 'реактор'];
    const foundPositives = positiveSignals.filter(s => textLower.includes(s));

    if (warnings.length > 0) {
        return `### ⚠️ Анализ производства: Требует проверки\n\n**Риски:**\n${warnings.map(w => `- ${w}`).join('\n')}\n\nРекомендуется ручная оценка чертежей.`;
    }

    if (foundPositives.length > 0) {
        return `### ✅ Анализ производства: Подходит\n\n**Обоснование:** Найдены знакомые материалы/оборудование (${foundPositives.slice(0, 3).join(', ')}). Технологический профиль соответствует фабрике (Токарка/Сварка/Сборка).`;
    }

    return `### ℹ️ Анализ производства: Недостаточно данных\n\nВ описании не найдены явные спецификации материалов. Требуется запрос тендерной документации.`;
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
        const analysisResult = analyzeFeasibility(fullTextForAnalysis);
        content += `\n\n---\n${analysisResult}`;

        // 4. Сохранение в Supabase
        const { error } = await supabase
            .from('research_reports')
            .insert({
                query: query,
                title: results[0].title, // Берем заголовок первого результата как основной
                content: content,
                url: results[0].url
            });

        if (error) {
            console.error("Supabase insert error:", error);
            return { success: false, message: "DB Error" };
        }

        return { success: true, resultsCount: results.length };

    } catch (error) {
        console.error("Research action error:", error);
        return { success: false, message: "Internal Error" };
    }
}
