import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const notes = await sql`SELECT * FROM notes WHERE trash=FALSE`;

        const now = new Date();
        const last7Days = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu" });

            const count = notes.filter(note => {
                const noteDate = new Date(note.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu" });
                return noteDate === dateStr;
            }).length;

            last7Days.push({
                date: date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' }),
                count
            });
        }

        return NextResponse.json(last7Days);
    } catch (error) {
        console.error('Error fetching productivity stats:', error);
        return NextResponse.json([], { status: 500 });
    }
}
