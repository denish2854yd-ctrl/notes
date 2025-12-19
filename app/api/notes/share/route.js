import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id } = await request.json();
        let shareid = Date.now().toString(36);
        const res = await sql.query(`update notes set shareid='${shareid}' WHERE id = ${id} returning shareid`);
        const shareID = res[0].shareid;
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Share id created with id ${shareID}', '${date}','shareidcreated','Share ID Created')`);

        return NextResponse.json({ success: true, shareid: shareID });
    } catch (error) {
        console.error('Error generating share ID:', error);
        return NextResponse.json({ success: false, shareid: null }, { status: 500 });
    }
}
