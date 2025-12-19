import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id, trash } = await request.json();
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        if (trash) {
            const res = await sql.query(`update notes set trash='true' WHERE id = ${id} returning id`);
            const deletedID = res[0].id;
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Note trashed with id ${deletedID}', '${date}','notetrashed','Note trashed')`);
        } else {
            const res = await sql.query(`update notes set trash='false' WHERE id = ${id} returning id`);
            const deletedID = res[0].id;
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Note recovered with id ${deletedID}', '${date}','notedrecovered','Note recovered')`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating trash status:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
