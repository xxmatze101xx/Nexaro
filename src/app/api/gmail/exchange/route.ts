import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/settings` : "http://localhost:3000/settings";

        if (!clientId || !clientSecret) {
            console.error("Missing Google OAuth credentials in environment variables.");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const data = await response.json();
        console.log("Google API Response Status:", response.status);
        console.log("Google API Response Data:", data);

        if (!response.ok) {
            console.error("Token exchange failed:", data);
            return NextResponse.json({ error: data.error_description || "Token exchange failed" }, { status: response.status });
        }

        return NextResponse.json({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        });
    } catch (error: any) {
        console.error("Error exchanging code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
