import { NextResponse } from 'next/server';
import { performCompetitorAnalysis } from '@/app/actions/analysis';

export async function POST(request: Request) {
    try {
        const { competitor_id, limit = 300, target_url } = await request.json();

        if (!competitor_id) {
            return NextResponse.json({ error: 'competitor_id required' }, { status: 400 });
        }

        const result = await performCompetitorAnalysis(competitor_id, limit, target_url);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Analysis API Error:', error);
        return NextResponse.json({
            error: 'Analysis failed',
            details: String(error)
        }, { status: 500 });
    }
}
