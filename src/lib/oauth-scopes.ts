/**
 * Central definition of required OAuth scopes per service.
 * Used by API routes to detect missing scopes and by the UI to prompt re-authorization.
 */

export const REQUIRED_SCOPES = {
    slack_bot: ["channels:history", "groups:history", "im:history", "chat:write"],
    slack_user: ["channels:read", "groups:read", "im:read", "users:read", "channels:history", "chat:write"],
} as const;

/**
 * Returns the scopes from `requiredScopes` that are NOT present in `grantedScopes`.
 * `grantedScopes` is a comma-separated string (as returned by Slack's token exchange).
 * Returns an empty array when all required scopes are granted.
 */
export function checkMissingScopes(
    grantedScopes: string,
    requiredScopes: readonly string[]
): string[] {
    const granted = new Set(
        grantedScopes.split(",").map(s => s.trim()).filter(Boolean)
    );
    return requiredScopes.filter(s => !granted.has(s));
}
