export default function NotFound() {
    return (
        <html lang="en">
            <body style={{ fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", margin: 0, background: "#f8fafc" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: "3rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>404</h1>
                    <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Diese Seite wurde nicht gefunden.</p>
                    <a href="/" style={{ marginTop: "1rem", display: "inline-block", color: "#3b82f6", textDecoration: "none" }}>Zurück zur App →</a>
                </div>
            </body>
        </html>
    );
}
