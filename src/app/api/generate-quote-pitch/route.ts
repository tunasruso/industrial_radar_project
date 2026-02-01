import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const { productName, competitorName, competitorPrice, analysisNotes, feasibilityScore } = await request.json();

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'OpenRouter API Key missing' }, { status: 500 });
        }

        const prompt = `Ты — лучший Sales Engineer завода "ЛабТех" (laboff.ru).
Наша специализация: Аналоги импортного и дорогого лабораторного оборудования. Металлообработка, токарка, фрезеровка.

КЛИЕНТ использует: "${productName}" от конкурента "${competitorName}".
Цена конкурента: ${competitorPrice ? competitorPrice + ' руб.' : 'Неизвестна'}.

ИНФОРМАЦИЯ ОТ ТЕХНОЛОГА:
${analysisNotes || 'Нет данных'} (Feasibility: ${feasibilityScore}%)

Твоя задача: Составить текст для Коммерческого Предложения (КП), чтобы убедить клиента переключиться на нас.
Акцент на: Импортозамещение, Локальное производство, Сроки, Качество.

Верни JSON:
{
  "subject": "Тема письма",
  "intro": "Вступление (обращение к проблеме)",
  "value_prop": "Почему мы лучше (3-4 буллета)",
  "closing": "Призыв к действию",
  "estimated_price": "Примерная цена (обычно на 15-20% ниже конкурента, если известна)"
}

Пиши на профессиональном русском языке, уверенно, но без воды.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('LLM Error');
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return NextResponse.json(JSON.parse(jsonMatch[0]));
        } else {
            return NextResponse.json({
                subject: `Предложение по ${productName}`,
                intro: content,
                value_prop: "Ошибка парсинга",
                closing: "",
                estimated_price: ""
            });
        }

    } catch (error) {
        console.error('Pitch generation error:', error);
        return NextResponse.json({ error: 'Failed to generate pitch' }, { status: 500 });
    }
}
