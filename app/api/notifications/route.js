import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || '*';

        let result = [];
        if (filter === "*") {
            result = await sql.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 40");
        } else {
            result = await sql.query(`SELECT * FROM notifications where category='${filter}' ORDER BY created_at DESC LIMIT 40`);
        }

        let obj = [];
        let categorySet = new Set();
        let labelSet = new Set();

        result.forEach(row => {
            categorySet.add(row.category);
            labelSet.add(row.label);
        });

        obj.push({ category: "*" });
        for (let category of categorySet) {
            obj.push({ category: category });
        }

        let c = 1;
        obj[0].label = "All";
        for (let label of labelSet) {
            obj[c].label = label;
            c++;
        }

        return NextResponse.json([result, obj]);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json([[], []], { status: 500 });
    }
}
