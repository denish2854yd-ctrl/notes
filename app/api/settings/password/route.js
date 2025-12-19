import { sql } from "@/lib/db";
import { AES } from "crypto-js";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { newPassword } = await request.json();
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Admin Password Changed', '${date}','passwordchange','Password Change')`);
        const encryptedPass = AES.encrypt(newPassword, process.env.SESSION_SECRET).toString();
        const res = await sql.query(`update password set pass = '${encryptedPass}', last_updated='${date}' where id = 1 returning id`);

        return NextResponse.json({ success: true, id: res[0].id });
    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
