import { MatchResult } from './supabase';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `
Ты — ведущий технолог завода 'Лабораторные Технологии' (Laboratory Technologies).
Твои ресурсы:
1. Парк станков: 
   - Lasermann LSS 1325 (лазерная резка металла)
   - CVD-печь (нанесение кремниевых покрытий, инертизация поверхности)
   - Сварочный лазер (точная сварка)
   - Токарно-фрезерный парк с ЧПУ.
2. Материалы на складе: Нержавеющая сталь 316L, 12Х18Н10Т, Латунь, Алюминий, PTFE.
3. Текущая номенклатура: Микрошприцы, пробоотборники (ПГО), сосуды под давлением до 10 МПа.

Твоя задача: Оценить коммерческую и техническую возможность производства найденного товара.
`;

export interface LLMScore {
    score: number;
    reason: string;
    recommended_machine: string;
    complexity: 'Low' | 'Medium' | 'High';
}

export async function evaluateProduct(title: string, description: string): Promise<LLMScore> {
    if (!OPENROUTER_API_KEY) {
        console.warn("OPENROUTER_API_KEY missing, using fallback scoring");
        return { score: 50, reason: "API Key missing", recommended_machine: "Unknown", complexity: "Medium" };
    }

    const prompt = `
    Товар: ${title}
    Описание: ${description.slice(0, 1000)}

    Проанализируй этот товар.
    Оцени по шкале 1-100:
    1. Техническая реализуемость (справимся ли мы?).
    2. Синергия с нашими продуктами (нужна ли CVD-печь или лазер?).
    3. Маржинальность (насколько сложно изделие).

    В ответе верни ТОЛЬКО JSON объект (без markdown форматирования):
    {
        "score": number,
        "reason": "Краткое обоснование (1-2 предложения)",
        "recommended_machine": "Название станка или 'None'",
        "complexity": "Low/Medium/High"
    }
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                // "HTTP-Referer": "https://labtechnologies.ru",
                // "X-Title": "Industrial Radar"
            },
            body: JSON.stringify({
                "model": "anthropic/claude-3.5-sonnet",
                "messages": [
                    { "role": "system", "content": SYSTEM_PROMPT },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        // Cleanup markdown if present
        const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("LLM Evaluation failed:", error);
        return {
            score: 40,
            reason: "Ошибка AI анализа, требуется ручная проверка",
            recommended_machine: "None",
            complexity: "Medium"
        };
    }
}
