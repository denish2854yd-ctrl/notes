import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id, favorite } = await request.json();
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        if (favorite) {
            const res = await sql.query(`update notes set fav='true' WHERE id = ${id} returning id`);
            const favID = res[0].id;
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Note added to favourite with id ${favID}', '${date}','noteaddedfav','Note Added Favoutite')`);
        } else {
            const res = await sql.query(`update notes set fav='false' WHERE id = ${id} returning id`);
            const favID = res[0].id;
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Note removed from favourite with id ${favID}', '${date}','noteremovedfav','Note Removed Favoutite')`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating favorite status:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
