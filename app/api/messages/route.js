import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { name, email, message } = await request.json();
        const nepaliTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        const time = nepaliTime;

        await sql`INSERT INTO messages (name, email, message, time) VALUES (${name}, ${email}, ${message}, ${time})`;

        return NextResponse.json({
            message: "Message saved successfully",
            success: true,
        });
    } catch (error) {
        console.error("Error saving message:", error);
        return NextResponse.json({
            message: "Error saving message",
            success: false,
        }, { status: 500 });
    }
}
