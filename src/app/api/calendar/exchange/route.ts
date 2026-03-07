import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();
        if (!code) {
            return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Missing Google credentials" }, { status: 500 });
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectUri = `${origin}/settings?service=calendar`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const data = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("Google token exchange error:", data);
            return NextResponse.json({ error: data.error_description || "Token exchange failed" }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Calendar exchange route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
