
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY not found in environment');
    process.exit(1);
}

async function testFirecrawl() {
    console.log('Testing Firecrawl API...');
    const url = 'https://energy1.ru/ru/catalog/category/probootbornyie-ustroystva/';
    console.log(`Target URL: ${url}`);

    try {
        console.log('Step 1: Mapping site (limit 5)...');
        const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://energy1.ru',
                search: 'products catalog',
                limit: 5
            })
        });

        if (!mapResponse.ok) {
            console.error('Map failed:', await mapResponse.text());
        } else {
            const mapData = await mapResponse.json();
            console.log('Map success! Found links:', mapData.links?.slice(0, 3));
        }

        console.log('Step 2: Scraping target page...');
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                formats: ['markdown'],
                waitFor: 1000
            })
        });

        if (!scrapeResponse.ok) {
            console.error('Scrape failed:', await scrapeResponse.text());
        } else {
            const scrapeData = await scrapeResponse.json();
            const md = scrapeData.data?.markdown || '';
            console.log(`Scrape success! Markdown length: ${md.length}`);
            console.log('Preview:', md.substring(0, 200));
        }

    } catch (error) {
        console.error('Test script crashed:', error);
    }
}

testFirecrawl();
