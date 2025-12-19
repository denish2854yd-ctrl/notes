import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        // Fetch data with error handling for optional tables
        const [notes, trashedNotes, favNotes, notifications] = await Promise.all([
            sql`SELECT * FROM notes WHERE trash=FALSE ORDER BY created_at DESC`,
            sql`SELECT * FROM notes WHERE trash=TRUE`,
            sql`SELECT * FROM notes WHERE fav=TRUE AND trash=FALSE`,
            sql`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10`
        ]);

        // Try to fetch targets, but handle gracefully if table doesn't exist
        let targets = [];
        try {
            const targetData = await sql`SELECT * FROM targetdate ORDER BY date ASC LIMIT 5`;

            // Process targets to calculate remaining days
            targets = targetData.map(t => {
                const today = new Date();
                const targetDate = new Date(t.date);
                const remainingTime = targetDate - today;
                const daysLeft = Math.floor(remainingTime / (1000 * 60 * 60 * 24));

                return {
                    id: t.id,
                    name: t.message || 'Unnamed Target',
                    targetdate: new Date(t.date).toLocaleDateString(),
                    leftdays: daysLeft
                };
            }).filter(t => t.leftdays >= 0); // Only show upcoming targets
        } catch (error) {
            console.log('Targets table not found, skipping...');
        }

        // Calculate stats
        const totalNotes = notes.length;
        const totalTrashed = trashedNotes.length;
        const totalFavorites = favNotes.length;
        const totalNotifications = notifications.length;

        // Get recent notes (last 5)
        const recentNotes = notes.slice(0, 5).map(note => ({
            id: note.id,
            title: note.title.replaceAll("&apos;", "'"),
            created_at: note.created_at,
            lastupdated: note.lastupdated,
            fav: note.fav
        }));

        // Calculate notes created today
        const today = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu" });
        const notesToday = notes.filter(note => {
            const noteDate = new Date(note.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu" });
            return noteDate === today;
        }).length;

        // Calculate notes this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const notesThisWeek = notes.filter(note => {
            const noteDate = new Date(note.created_at);
            return noteDate >= weekAgo;
        }).length;

        // Get category distribution
        const categoryStats = {};
        notes.forEach(note => {
            const category = note.category || 'Uncategorized';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        });

        return NextResponse.json({
            totalNotes,
            totalTrashed,
            totalFavorites,
            totalNotifications,
            notesToday,
            notesThisWeek,
            recentNotes,
            recentNotifications: notifications.map(n => ({
                id: n.id,
                title: n.title,
                created_at: n.created_at,
                category: n.category,
                label: n.label
            })),
            categoryStats,
            upcomingTargets: targets
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(null, { status: 500 });
    }
}
