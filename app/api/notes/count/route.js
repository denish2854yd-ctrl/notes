import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const data = await sql.query("select * from notes where trash=FALSE");
        return NextResponse.json({ count: data.length });
    } catch (error) {
        console.error('Error fetching notes count:', error);
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}
