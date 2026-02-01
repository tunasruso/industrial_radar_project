import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// LLM-based product matching endpoint
export async function POST(request: Request) {
    try {
        const { competitorProduct, competitorName } = await request.json();

        // Get all our products to compare against
        const { data: ourProducts, error } = await supabase
            .from('our_products')
            .select('*');

        if (error) throw error;
        if (!ourProducts || ourProducts.length === 0) {
            return NextResponse.json({ matches: [], message: 'No products in catalog' });
        }

        // Call OpenRouter for semantic matching
        const openRouterKey = process.env.OPENROUTER_API_KEY;

        if (!openRouterKey) {
            // Fallback to simple text matching if no API key
            const matches = findSimpleMatches(competitorProduct, ourProducts);
            return NextResponse.json({ matches, matching_method: 'simple' });
        }

        // Prepare product list for LLM (limit to prevent token overflow)
        const productList = ourProducts.slice(0, 100).map((p, i) =>
            `${i + 1}. [${p.id}] ${p.name} - ${p.price_vat}₽ (${p.category})`
        ).join('\n');

        const prompt = `Ты эксперт по лабораторному оборудованию. Найди наиболее похожие товары из нашего каталога для товара конкурента.

ТОВАР КОНКУРЕНТА (${competitorName}):
"${competitorProduct}"

НАШ КАТАЛОГ (первые 100 товаров):
${productList}

Задача: Найди 1-3 товара из нашего каталога, которые являются аналогами или похожими товарами. Учитывай:
- Тип оборудования
- Характеристики (объем, материал, давление)
- Назначение
- Модификации могут называться по-разному на русском и английском

Если точных совпадений нет - найди ближайшие категориально похожие товары.

Ответ в JSON формате:
{
  "matches": [
    {"product_id": number, "confidence": 0-100, "reason": "краткое объяснение"}
  ]
}

Если совпадений вообще нет, верни пустой массив matches.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterKey}`,
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            console.error('OpenRouter error:', await response.text());
            const matches = findSimpleMatches(competitorProduct, ourProducts);
            return NextResponse.json({ matches, matching_method: 'simple_fallback' });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            const matches = findSimpleMatches(competitorProduct, ourProducts);
            return NextResponse.json({ matches, matching_method: 'simple_fallback' });
        }

        const parsed = JSON.parse(content);

        // Enrich matches with full product data
        const enrichedMatches = (parsed.matches || []).map((match: { product_id: number; confidence: number; reason: string }) => {
            const product = ourProducts.find(p => p.id === match.product_id);
            return {
                ...match,
                product: product || null
            };
        }).filter((m: { product: unknown }) => m.product);

        return NextResponse.json({
            matches: enrichedMatches,
            matching_method: 'llm'
        });

    } catch (error) {
        console.error('Matching error:', error);
        return NextResponse.json({
            error: 'Failed to match products',
            matches: []
        }, { status: 500 });
    }
}

// Simple text-based matching as fallback
function findSimpleMatches(query: string, products: Array<{ id: number; name: string; price_vat: number; category: string }>) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scored = products.map(product => {
        const nameLower = product.name.toLowerCase();
        const catLower = product.category.toLowerCase();

        let score = 0;

        // Check for word matches
        queryWords.forEach(word => {
            if (nameLower.includes(word)) score += 10;
            if (catLower.includes(word)) score += 5;
        });

        // Check for common patterns
        const patterns = ['пробоотборник', 'шприц', 'вентиль', 'батометр', 'термо', 'пго', 'luer'];
        patterns.forEach(pattern => {
            if (queryLower.includes(pattern) && nameLower.includes(pattern)) {
                score += 20;
            }
        });

        return { ...product, score };
    });

    return scored
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(p => ({
            product_id: p.id,
            product: { id: p.id, name: p.name, price_vat: p.price_vat, category: p.category },
            confidence: Math.min(p.score * 2, 100),
            reason: 'Совпадение по ключевым словам'
        }));
}
