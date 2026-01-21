'use server';

import { tavily } from '@tavily/core';
import { createClient } from '@supabase/supabase-js';

// Используем публичный URL и ANON KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

import { evaluateProduct } from '@/lib/llm';

// ... (keep headers)

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

        // 2. Формирование контента для анализа
        let fullTextForAnalysis = "";
        let content = `# Отчет по запросу: ${query}\n\n`;

        for (const res of results) {
            content += `### [${res.title}](${res.url})\n\n${res.content.slice(0, 800)}...\n\n---\n`;
            fullTextForAnalysis += `${res.title}\n${res.content}\n\n`;
        }

        // 3. Анализ (AI Expert) - ЗАМЕНЯЕМ ЭВРИСТИКУ НА LLM
        console.log("Calling LLM Expert...");
        const aiEvaluation = await evaluateProduct(results[0].title, fullTextForAnalysis.slice(0, 2000));

        content += `\n\n### 🧠 Вердикт AI Технолога\n`;
        content += `**Оценка:** ${aiEvaluation.score}/100\n`;
        content += `**Вердикт:** ${aiEvaluation.reason}\n`;
        content += `**Реком. оборудование:** ${aiEvaluation.recommended_machine}\n`;
        content += `**Сложность:** ${aiEvaluation.complexity}\n`;

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

        // 5. Генерация записи в Matching Results
        if (aiEvaluation.score >= 50) { // Порог теперь ниже, так как AI строже
            const productName = results[0].title.slice(0, 100);

            // Проверка на дубликаты
            const { data: existingMatch } = await supabase
                .from('matching_results')
                .select('id')
                .eq('product_name', productName)
                .single();

            if (!existingMatch) {
                const article = `TND-${Math.floor(Math.random() * 1000)}`;
                // Цена теперь может зависеть от сложности (упрощенно)
                const basePrice = 50000;
                const multiplier = aiEvaluation.complexity === 'High' ? 5 : aiEvaluation.complexity === 'Medium' ? 2 : 1;
                const price = Math.floor(basePrice * multiplier + Math.random() * 20000);

                await supabase
                    .from('matching_results')
                    .insert({
                        article: article,
                        product_name: productName,
                        confidence_score: aiEvaluation.score,
                        estimated_cost: price,
                        category: `R&D • ${aiEvaluation.recommended_machine}`,
                        material: aiEvaluation.reason.slice(0, 50) // Сохраняем часть обоснования как материал/инфо
                    });
                console.log("Added to matching_results with AI score:", aiEvaluation.score);
            } else {
                console.log("Skipping duplicate matching result for:", productName);
            }
        }

        return { success: true, resultsCount: results.length };

    } catch (error) {
        console.error("Research action error:", error);
        return { success: false, message: "Internal Error" };
    }
}
