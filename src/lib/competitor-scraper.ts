const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export interface ScrapedProduct {
    name: string;
    price?: number;
}

export async function scrapeCompetitorProducts(websiteUrl: string, limit: number, specificPage?: string): Promise<ScrapedProduct[]> {
    if (!FIRECRAWL_API_KEY) {
        console.log('Firecrawl API key not found');
        return [];
    }

    try {
        let productPages: string[] = [];

        if (specificPage) {
            console.log(`Using specific target page: ${specificPage}`);
            productPages = [specificPage];
            // TODO: Optional - Try to find pagination from this page if we want to be thorough
        } else {
            // Step 1: Map the website to find product/catalog pages
            console.log(`Mapping website: ${websiteUrl}`);
            productPages = await findProductPages(websiteUrl);

            if (productPages.length === 0) {
                console.log('No product pages found, trying to scrape main page');
                // Fallback: scrape main page
                const mainContent = await scrapeSinglePage(websiteUrl);
                return await extractProductsWithLLM(mainContent, limit);
            }
        }

        console.log(`Found ${productPages.length} product pages to scrape`);

        // Step 2: Parallel scraping (limit concurrency to 3)
        const allProducts: ScrapedProduct[] = [];
        const pagesToScrape = productPages.slice(0, 3); // Limit to 3 pages for speed

        const results = await Promise.all(pagesToScrape.map(async (pageUrl) => {
            console.log(`Scraping page: ${pageUrl}`);
            try {
                const content = await scrapeSinglePage(pageUrl);
                return await extractProductsWithLLM(content, Math.ceil(limit / pagesToScrape.length) || 10);
            } catch (e) {
                console.error(`Failed to scrape ${pageUrl}:`, e);
                return [];
            }
        }));

        for (const products of results) {
            allProducts.push(...products);
        }

        return allProducts.slice(0, limit);

    } catch (error) {
        console.error('Scrape error:', error);
        return [];
    }
}

async function findProductPages(baseUrl: string): Promise<string[]> {
    try {
        // Use Firecrawl map to discover pages
        const response = await fetch('https://api.firecrawl.dev/v1/map', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: baseUrl,
                search: 'products catalog price продукция каталог прайс оборудование',
                limit: 20
            })
        });

        if (!response.ok) {
            console.error('Map API error:', await response.text());
            return [];
        }

        const data = await response.json();
        const links: string[] = data.links || [];

        // Filter for product-related pages
        const productKeywords = ['product', 'catalog', 'price', 'продукц', 'каталог', 'прайс', 'оборудов', 'товар', 'equipment'];

        const productPages = links.filter(url => {
            const lowerUrl = url.toLowerCase();
            return productKeywords.some(keyword => lowerUrl.includes(keyword));
        });

        // If no product pages found, try common patterns
        if (productPages.length === 0) {
            const commonPaths = ['/products', '/catalog', '/production', '/equipment', '/продукция', '/каталог'];
            for (const path of commonPaths) {
                const testUrl = new URL(path, baseUrl).toString();
                if (links.includes(testUrl) || links.some(l => l.includes(path))) {
                    productPages.push(testUrl);
                }
            }
        }

        return productPages.length > 0 ? productPages : [baseUrl];

    } catch (error) {
        console.error('Find product pages error:', error);
        return [baseUrl];
    }
}

export async function scrapeSinglePage(url: string): Promise<string> {
    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                formats: ['markdown'],
                waitFor: 3000
            })
        });

        if (!response.ok) {
            console.error('Scrape page error:', await response.text());
            return '';
        }

        const data = await response.json();
        return data.data?.markdown || '';

    } catch (error) {
        console.error('Scrape single page error:', error);
        return '';
    }
}

async function extractProductsWithLLM(content: string, limit: number): Promise<ScrapedProduct[]> {
    if (!content || content.length < 100 || !OPENROUTER_API_KEY) {
        return parseProductsFromMarkdown(content, limit);
    }

    // Truncate content if too long
    const truncatedContent = content.substring(0, 15000);

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
                    content: `Извлеки список продуктов/товаров с этой страницы сайта конкурента.
Найди названия продуктов, модели, оборудование. Если есть цены - укажи их.

Содержимое страницы:
${truncatedContent}

Верни JSON массив продуктов (до ${limit} штук):
[{"name": "Название продукта/модель", "price": 12345}, ...]

Если цены нет, укажи price: 0. Верни ТОЛЬКО JSON массив.`
                }],
                temperature: 0.2
            })
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';
            const jsonMatch = text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                const products = JSON.parse(jsonMatch[0]);
                return products
                    .filter((p: any) => p.name && p.name.length >= 3)
                    .slice(0, limit)
                    .map((p: any) => ({
                        name: String(p.name).substring(0, 300),
                        price: p.price > 0 ? p.price : undefined
                    }));
            }
        }
    } catch (error) {
        console.error('LLM extraction error:', error);
    }

    // Fallback to regex parsing
    return parseProductsFromMarkdown(content, limit);
}

function parseProductsFromMarkdown(markdown: string, limit: number): ScrapedProduct[] {
    if (!markdown) return [];

    const products: ScrapedProduct[] = [];
    const lines = markdown.split('\n');

    const pricePattern = /(\d[\d\s,\.]+)\s*(₽|руб|RUB|р\.)/gi;

    for (const line of lines) {
        if (products.length >= limit) break;
        if (line.length < 10 || line.startsWith('#')) continue;

        const priceMatch = line.match(pricePattern);
        if (priceMatch) {
            const priceIndex = line.search(pricePattern);
            const name = line.substring(0, priceIndex).replace(/[|*_\[\]]/g, '').trim();

            if (name.length > 5) {
                const priceStr = priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.');
                const price = parseFloat(priceStr);

                products.push({
                    name: name.substring(0, 300),
                    price: price > 0 ? price : undefined
                });
            }
        }
    }

    return products;
}
