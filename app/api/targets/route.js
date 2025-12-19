import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const res = await sql.query(`SELECT * FROM targetdate`);

        let data = res.map((row) => {
            const today = new Date();
            const targetDate = new Date(row.date);
            const startDate = new Date(row.created_at);

            const totalDuration = targetDate - startDate;
            const elapsedTime = today - startDate;
            const remainingTime = targetDate - today;

            row.months = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 30));
            row.days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
            row.hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            row.minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

            row.progressPercentage = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100)) : 0;
            row.progressPercentage = Math.floor(row.progressPercentage);

            return row;
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching targets:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { date, message } = await request.json();
        const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        const res = await sql.query(`insert into targetdate (date, created_at, message) values ('${date}', '${today}','${message}') returning id`);

        return NextResponse.json({ success: true, id: res[0].id });
    } catch (error) {
        console.error("Error adding target:", error);
        return NextResponse.json({ success: false, id: null }, { status: 500 });
    }
}
