'use server';

import { tavily } from '@tavily/core';
import { createClient } from '@supabase/supabase-js';

// Используем публичный URL и ANON KEY, так как настроили RLS "Allow anon insert"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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
        let content = `# Отчет по запросу: ${query}\n\n`;
        for (const res of results) {
            content += `### [${res.title}](${res.url})\n\n${res.content}\n\n---\n`;
        }

        // 3. Сохранение в Supabase
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
