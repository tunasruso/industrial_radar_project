import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        let products: Array<{ name: string; price: number }> = [];

        if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
            const text = await file.text();
            products = parseTextData(text);
        } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
            const buffer = await file.arrayBuffer();
            products = await parseExcelWithAI(buffer);
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            const buffer = await file.arrayBuffer();
            products = await parseWordWithAI(buffer);
        } else {
            return NextResponse.json({
                error: 'Unsupported file format. Use .xls, .xlsx, .doc, .docx, .csv, or .txt'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            products,
            count: products.length
        });
    } catch (error) {
        console.error('Parse error:', error);
        return NextResponse.json({
            error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

function parseTextData(text: string): Array<{ name: string; price: number }> {
    const lines = text.split('\n').filter(line => line.trim());
    const products: Array<{ name: string; price: number }> = [];

    for (const line of lines) {
        let parts = line.split('\t');
        if (parts.length < 2) parts = line.split(';');
        if (parts.length < 2) parts = line.split(',');

        if (parts.length >= 2) {
            const name = parts[0].trim();
            for (let i = 1; i < parts.length; i++) {
                const priceStr = parts[i].replace(/[^\d.,]/g, '').replace(',', '.');
                const price = parseFloat(priceStr);
                if (price && price > 0) {
                    products.push({ name, price });
                    break;
                }
            }
        }
    }
    return products;
}

async function parseExcelWithAI(buffer: ArrayBuffer): Promise<Array<{ name: string; price: number }>> {
    const XLSX = await import('xlsx');

    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Get sample rows to analyze structure (first 20 rows)
    const sampleRows = data.slice(0, 20).map(row =>
        row.map(cell => String(cell || '').substring(0, 50)).join(' | ')
    ).join('\n');

    // Use LLM to understand the structure
    let nameColIndex = 1;
    let priceColIndex = -1;
    let startRow = 0;

    if (OPENROUTER_API_KEY) {
        try {
            const structurePrompt = `Проанализируй структуру этого Excel файла (прайс-лист конкурента).
Определи:
1. Номер строки с которой начинаются данные о товарах (0-indexed)
2. Номер колонки с названием товара (0-indexed)
3. Номер колонки с ценой (0-indexed)

Первые 20 строк файла:
${sampleRows}

Ответь ТОЛЬКО в JSON формате:
{"startRow": N, "nameCol": N, "priceCol": N}`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: structurePrompt }],
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const result = await response.json();
                const content = result.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*?\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    startRow = parsed.startRow || 0;
                    nameColIndex = parsed.nameCol ?? 1;
                    priceColIndex = parsed.priceCol ?? -1;
                    console.log(`AI detected: startRow=${startRow}, nameCol=${nameColIndex}, priceCol=${priceColIndex}`);
                }
            }
        } catch (error) {
            console.error('AI structure detection failed, using fallback:', error);
        }
    }

    // Fallback: detect headers manually
    if (priceColIndex === -1) {
        for (let i = 0; i < Math.min(15, data.length); i++) {
            const row = data[i];
            if (!row) continue;
            for (let j = 0; j < row.length; j++) {
                const cell = String(row[j] || '').toLowerCase();
                if (cell.includes('цена') || cell.includes('ндс') || cell.includes('стоимость')) {
                    priceColIndex = j;
                    if (startRow === 0) startRow = i + 1;
                    break;
                }
            }
            if (priceColIndex !== -1) break;
        }
    }

    // Parse all rows
    const products: Array<{ name: string; price: number }> = [];

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;

        // Get name from detected column
        let name = String(row[nameColIndex] || '').trim();

        // If name is too short, search for longest text
        if (name.length < 5) {
            for (let j = 0; j < Math.min(5, row.length); j++) {
                const text = String(row[j] || '').trim();
                if (text.length > name.length && !/^\d+[,.]?\d*$/.test(text)) {
                    name = text;
                }
            }
        }

        // Get price from detected column or search
        let price = 0;

        if (priceColIndex >= 0 && priceColIndex < row.length) {
            const cellValue = row[priceColIndex];
            if (typeof cellValue === 'number') {
                price = cellValue;
            } else {
                const priceStr = String(cellValue || '').replace(/[^\d.,]/g, '').replace(',', '.');
                price = parseFloat(priceStr) || 0;
            }
        }

        // Search from right for price if not found
        if (!price || price <= 0) {
            for (let j = row.length - 1; j >= 0; j--) {
                const cellValue = row[j];
                if (typeof cellValue === 'number' && cellValue > 10) {
                    price = cellValue;
                    break;
                }
            }
        }

        // Add if valid
        if (name.length >= 5 && price > 0) {
            products.push({
                name: name.substring(0, 300),
                price
            });
        }
    }

    // If we got very few products, try AI-based extraction for complex formats
    if (products.length < 50 && data.length > 50 && OPENROUTER_API_KEY) {
        console.log('Few products found, trying AI batch extraction...');
        const aiProducts = await extractProductsWithAI(data, startRow);
        if (aiProducts.length > products.length) {
            return aiProducts;
        }
    }

    console.log(`Parsed ${products.length} products from Excel`);
    return products;
}

async function extractProductsWithAI(data: any[][], startRow: number): Promise<Array<{ name: string; price: number }>> {
    if (!OPENROUTER_API_KEY) return [];

    const products: Array<{ name: string; price: number }> = [];
    const batchSize = 50;

    // Process in batches
    for (let i = startRow; i < Math.min(data.length, startRow + 500); i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchText = batch.map(row =>
            row.map(cell => String(cell || '')).join('\t')
        ).join('\n');

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{
                        role: 'user',
                        content: `Извлеки товары и цены из этого фрагмента прайс-листа.
Формат ответа - JSON массив: [{"name": "...", "price": 123.45}, ...]

Данные:
${batchText}

Верни ТОЛЬКО JSON массив, без пояснений.`
                    }],
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const result = await response.json();
                const content = result.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\[[\s\S]*\]/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    for (const item of parsed) {
                        if (item.name && item.price > 0) {
                            products.push({
                                name: String(item.name).substring(0, 300),
                                price: parseFloat(item.price)
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('AI extraction batch failed:', error);
        }

        // Small delay between batches
        await new Promise(r => setTimeout(r, 200));
    }

    return products;
}

async function parseWordWithAI(buffer: ArrayBuffer): Promise<Array<{ name: string; price: number }>> {
    // Convert ArrayBuffer to Buffer for mammoth
    const mammoth = await import('mammoth');
    const nodeBuffer = Buffer.from(buffer);

    // Extract text from Word document
    const result = await mammoth.extractRawText({ buffer: nodeBuffer });
    const text = result.value;

    if (!text || text.length < 50) {
        console.log('Word document is empty or too short');
        return [];
    }

    // Use AI to extract products from the text
    if (!OPENROUTER_API_KEY) {
        // Fallback: try to parse as plain text
        return parseTextData(text);
    }

    const products: Array<{ name: string; price: number }> = [];

    // Split text into chunks for processing
    const lines = text.split('\n').filter(l => l.trim());
    const batchSize = 100;

    for (let i = 0; i < Math.min(lines.length, 1000); i += batchSize) {
        const batch = lines.slice(i, i + batchSize).join('\n');

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{
                        role: 'user',
                        content: `Извлеки товары и цены из этого фрагмента прайс-листа (Word документ).
Найди названия товаров и их цены. Формат ответа - JSON массив:
[{"name": "Название товара", "price": 12345.67}, ...]

Текст:
${batch}

Верни ТОЛЬКО JSON массив. Если товаров нет, верни [].`
                    }],
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const result = await response.json();
                const content = result.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\[[\s\S]*\]/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    for (const item of parsed) {
                        if (item.name && item.name.length >= 5 && item.price > 0) {
                            products.push({
                                name: String(item.name).substring(0, 300),
                                price: parseFloat(item.price)
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Word AI extraction error:', error);
        }

        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Parsed ${products.length} products from Word document`);
    return products;
}
