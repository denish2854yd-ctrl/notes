"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export async function verifyAuth(request) {
    // Check for session cookie (browser auth)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
        return { authenticated: true, method: "session" };
    }

    // Check for X-API-Token header (API token auth)
    const apiToken = request?.headers?.get("x-api-token");

    if (apiToken) {
        try {
            // Verify the token exists in database and is active
            const result = await sql`
                SELECT id, token, name, created_at, last_used 
                FROM api_tokens 
                WHERE token = ${apiToken} AND revoked = FALSE
            `;

            if (result.length > 0) {
                // Update last_used timestamp
                const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
                await sql`
                    UPDATE api_tokens 
                    SET last_used = ${now} 
                    WHERE token = ${apiToken}
                `;

                return {
                    authenticated: true,
                    method: "token",
                    tokenId: result[0].id,
                    tokenName: result[0].name
                };
            }
        } catch (error) {
            console.error("Token verification failed:", error);
        }
    }

    return { authenticated: false };
}

export async function requireAuth(request) {
    const auth = await verifyAuth(request);

    if (!auth.authenticated) {
        return {
            error: true,
            status: 401,
            message: "Unauthorized. Please provide valid authentication via session cookie or X-API-Token header."
        };
    }

    return { error: false, auth };
}
