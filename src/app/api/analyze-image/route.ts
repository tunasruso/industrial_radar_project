import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const { image } = await request.json(); // base64 data url

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'OpenRouter API Key missing' }, { status: 500 });
        }

        if (!image) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        const prompt = `Ты — эксперт-технолог металлообрабатывающего производства.
Проанализируй это изображение (чертеж или фото детали).

Определи:
1. Что это за деталь (Название/Тип).
2. Вероятный материал (Сталь, Алюминий, Пластик, Титан?).
3. Необходимые производственные операции (Токарная обработка, Фрезеровка, Лазерная резка, Гибка, Сварка).
4. Оценка сложности изготовления (1-10, где 1 - простая шайба, 10 - деталь авиадвигателя).
5. Краткие конструктивные особенности (наличие резьбы, пазов, допусков если видны).

Верни ответ ТОЛЬКО в формате JSON:
{
  "name": "Название",
  "material": "Материал",
  "processes": ["Токарка", "Фрезеровка"],
  "complexity": 5,
  "features": "Описание особенностей",
  "manufacturing_advice": "Совет по производству"
}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: image } }
                        ]
                    }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenRouter Vision Error:', err);
            throw new Error('Vision API Error');
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        let result = {};
        if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
        } else {
            result = { name: "Ошибка анализа", description: content };
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Image analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
    }
}
