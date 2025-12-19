import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const activities = await sql`
            SELECT 'note' as type, id, title, created_at as timestamp 
            FROM notes WHERE trash=FALSE 
            ORDER BY created_at DESC LIMIT 10
        `;

        const result = activities.map(a => ({
            type: a.type,
            id: a.id,
            title: a.title?.replaceAll("&apos;", "'") || 'Untitled',
            timestamp: a.timestamp
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching activity timeline:', error);
        return NextResponse.json([], { status: 500 });
    }
}
