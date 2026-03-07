import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { refresh_token } = await req.json();
        if (!refresh_token) {
            return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Missing Google credentials" }, { status: 500 });
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                refresh_token,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
            }),
        });

        const data = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("Google calendar token refresh error:", data);
            return NextResponse.json({ error: data.error_description || "Token refresh failed" }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Calendar refresh route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
