import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/notes/trashed
 * Get all notes that are in trash (requires authentication via session or API token)
 */
export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const result = await sql`
            SELECT * FROM notes 
            WHERE trash = TRUE 
            ORDER BY created_at DESC
        `;

        // Decode HTML entities in title and body
        result.forEach((row) => {
            row.title = row.title.replaceAll("&apos;", "'");
            row.body = row.body.replaceAll("&apos;", "'");
        });

        return NextResponse.json({
            success: true,
            count: result.length,
            notes: result
        });
    } catch (error) {
        console.error('Error fetching trashed notes:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch trashed notes'
        }, { status: 500 });
    }
}
