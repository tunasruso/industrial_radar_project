
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
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.warn("❌ OPENROUTER_API_KEY missing, using fallback scoring");
        return { score: 50, reason: "API Key missing", recommended_machine: "Unknown", complexity: "Medium" };
    }

    console.log("✅ OpenRouter API Key found, calling LLM...");

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
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
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
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
        const parsed = JSON.parse(jsonStr);

        return {
            score: typeof parsed.score === 'number' ? parsed.score : 50,
            reason: parsed.reason || 'No reason',
            recommended_machine: parsed.recommended_machine || 'None',
            complexity: parsed.complexity || 'Medium'
        };

    } catch (error) {
        console.error("LLM Evaluation failed:", error);
        return {
            score: 40,
            reason: "Ошибка AI анализа",
            recommended_machine: "None",
            complexity: "Medium"
        };
    }
}

export interface CompetitorVerification {
    isCompetitor: boolean;
    name: string;
    description: string;
    score: number;
    match_reason: string;
    products: Array<{ name: string; price: number }>;
}

export async function verifyCompetitor(content: string, context?: string, targetCountry?: string): Promise<CompetitorVerification> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { isCompetitor: false, name: "", description: "No API Key", score: 0, match_reason: "No API", products: [] };

    const prompt = `
    Role: Smart Market Analyst for "Laboratory Technologies" (laboff.ru).
    Goal: Identify if the analyzed website belongs to a relevant competitor in ${targetCountry || 'Russia'}.
    
    OUR PROFILE (CONTEXT):
    ${context || 'We manufacture: Laboratory reactors, High-pressure vessels, Metal labware, Samplers, CVD coating services.'}

    WEBSITE CONTENT:
    ${content.slice(0, 4000)}

    CRITERIA for "True Competitor" (Score > 70):
    1. Must operate in ${targetCountry || 'Russia'}.
    2. Must sell products that overlap with OUR PROFILE (Reactors, Vessels, Samplers).
    3. If they only sell Glassware or Chemicals -> Low Score (<30). We need Metal/Equipment competitors.

    Output JSON ONLY:
    {
        "isCompetitor": boolean, // True if Score > 70
        "score": number, // 0-100 Relevance Score
        "name": "Company Name",
        "description": "Short description focusing on overlap",
        "match_reason": "Why is it a match? Mention overlapping products.",
        "products": [
            // List up to 10 relevant products found with prices
            { "name": "Product Name", "price": 1000 }
        ]
    }
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [{ "role": "user", "content": prompt }]
            })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isCompetitor: parsed.isCompetitor || (parsed.score > 70),
                score: parsed.score || 0,
                name: parsed.name || "Unknown",
                description: parsed.description || "",
                match_reason: parsed.match_reason || "",
                products: Array.isArray(parsed.products) ? parsed.products : []
            };
        }
        return { isCompetitor: false, name: "", description: "Parse Error", score: 0, match_reason: "Parse Error", products: [] };
    } catch (e) {
        console.error("Verification failed", e);
        return { isCompetitor: false, name: "", description: "Error", score: 0, match_reason: "Error", products: [] };
    }
}

export async function filterSnippets(snippets: Array<{ title: string; url: string; content: string }>, context?: string): Promise<string[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return snippets.map(s => s.url).slice(0, 3); // Fallback

    const prompt = `
    Role: Senior Market Researcher.
    Task: Filter search results to identify high-probability MANUFACTURERS of industrial equipment.
    
    Context (Our Profile):
    ${context || 'Industrial equipment, reactors, vessels, metal labware.'}

    Candidates:
    ${snippets.map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.content.slice(0, 200)}`).join('\n')}

    Instructions:
    1. select URLs that look like DIRECT MANUFACTURERS or OFFICIAL DISTRIBUTORS.
    2. EXCLUDE: Directories (Yelp, YellowPages, Catalogs), News, Gov sites, Research Papers, Social Media.
    3. Return ONLY a JSON array of valid URLs strings.

    Example: ["https://example.com", "https://factory.ru"]
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [{ "role": "user", "content": prompt }]
            })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return snippets.slice(0, 3).map(s => s.url);
    } catch (e) {
        console.warn("Filter failed", e);
        return snippets.slice(0, 3).map(s => s.url);
    }
}
