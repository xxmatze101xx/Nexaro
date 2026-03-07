import { doc, getDoc, setDoc, updateDoc, serverTimestamp, type FieldValue, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    createdAt: FieldValue | Timestamp;
    updatedAt: FieldValue | Timestamp;
}

/**
 * Ensures a user document exists in Firestore after login/registration.
 */
export async function createUserProfileDoc(uid: string, data: Partial<UserProfile>) {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const { email, displayName, photoURL } = data;
        const createdAt = serverTimestamp();

        try {
            await setDoc(userRef, {
                uid,
                email,
                displayName: displayName || "",
                photoURL: photoURL || "",
                createdAt,
                updatedAt: createdAt,
            });
        } catch (error) {
            console.error("Error creating user document", error);
        }
    }
}

/**
 * Updates an existing user's profile information (name, photo).
 */
export async function updateUserProfile(uid: string, data: { displayName?: string; photoURL?: string }) {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error updating user document", error);
    }
}

/**
 * Retrieves a user's profile data from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    }
    return null;
}

/**
 * Saves the Gmail refresh token for a specific email.
 * Stored in a private subcollection: users/{uid}/private/gmail -> { accounts: [{ email, refresh_token }] }
 */
export async function saveGmailRefreshToken(uid: string, refreshToken: string, profileEmail: string) {
    if (!uid || !profileEmail) return;
    const ref = doc(db, "users", uid, "private", "gmail");
    const snap = await getDoc(ref);

    let accounts: { email: string; refresh_token: string }[] = [];
    if (snap.exists()) {
        const data = snap.data();
        if (data.accounts && Array.isArray(data.accounts)) {
            accounts = data.accounts as typeof accounts;
        } else if (data.refresh_token) {
            // Migrate old format
            accounts = [{ email: data.profile_email || "Unknown", refresh_token: data.refresh_token }];
        }
    }

    const existingIndex = accounts.findIndex(a => a.email === profileEmail);
    if (existingIndex >= 0) {
        accounts[existingIndex].refresh_token = refreshToken;
    } else {
        accounts.push({ email: profileEmail, refresh_token: refreshToken });
    }

    await setDoc(ref, { accounts, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Retrieves all connected Gmail accounts.
 */
export async function getGmailAccounts(uid: string): Promise<{ email: string, token: string }[]> {
    if (!uid) return [];
    const ref = doc(db, "users", uid, "private", "gmail");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        if (data.accounts && Array.isArray(data.accounts)) {
            return data.accounts;
        } else if (data.refresh_token) {
            // Support legacy format
            return [{ email: data.profile_email || "Unknown", token: data.refresh_token }];
        }
    }
    return [];
}

/**
 * Retrieves the Gmail refresh token for a specific email.
 */
export async function getGmailRefreshToken(uid: string, email: string): Promise<{ token: string | null, email: string | null }> {
    const accounts = await getGmailAccounts(uid);
    const account = accounts.find(a => a.email === email);
    return account ? { token: account.token, email: account.email } : { token: null, email: null };
}

/**
 * Disconnects a specific Gmail account by removing it from the array.
 */
export async function disconnectGmail(uid: string, email: string) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "private", "gmail");
    const accounts = await getGmailAccounts(uid);
    const updatedAccounts = accounts.filter(a => a.email !== email);
    await setDoc(ref, { accounts: updatedAccounts, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Google Calendar ───────────────────────────────────────────────────────────

export interface CalendarAccount {
    email: string;
    refresh_token: string;
    visible: boolean;
}

/**
 * Saves the Google Calendar refresh token for a specific email.
 * Stored in: users/{uid}/private/calendar → { accounts: [...] }
 */
export async function saveCalendarRefreshToken(uid: string, refreshToken: string, profileEmail: string) {
    if (!uid || !profileEmail) return;
    const ref = doc(db, "users", uid, "private", "calendar");
    const snap = await getDoc(ref);

    let accounts: CalendarAccount[] = [];
    if (snap.exists()) {
        const data = snap.data();
        if (data.accounts && Array.isArray(data.accounts)) {
            accounts = data.accounts;
        }
    }

    const existingIndex = accounts.findIndex(a => a.email === profileEmail);
    if (existingIndex >= 0) {
        accounts[existingIndex].refresh_token = refreshToken;
    } else {
        accounts.push({ email: profileEmail, refresh_token: refreshToken, visible: true });
    }

    await setDoc(ref, { accounts, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Retrieves all connected Google Calendar accounts.
 */
export async function getCalendarAccounts(uid: string): Promise<CalendarAccount[]> {
    if (!uid) return [];
    const ref = doc(db, "users", uid, "private", "calendar");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        if (data.accounts && Array.isArray(data.accounts)) {
            return data.accounts as CalendarAccount[];
        }
    }
    return [];
}

/**
 * Retrieves the Calendar refresh token for a specific email.
 */
export async function getCalendarRefreshToken(uid: string, email: string): Promise<string | null> {
    const accounts = await getCalendarAccounts(uid);
    const account = accounts.find(a => a.email === email);
    return account ? account.refresh_token : null;
}

/**
 * Disconnects a specific Google Calendar account.
 */
export async function disconnectCalendar(uid: string, email: string) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "private", "calendar");
    const accounts = await getCalendarAccounts(uid);
    const updatedAccounts = accounts.filter(a => a.email !== email);
    await setDoc(ref, { accounts: updatedAccounts, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Toggles the visibility flag for a specific Google Calendar account.
 */
export async function setCalendarAccountVisibility(uid: string, email: string, visible: boolean) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "private", "calendar");
    const accounts = await getCalendarAccounts(uid);
    const updatedAccounts = accounts.map(a => a.email === email ? { ...a, visible } : a);
    await setDoc(ref, { accounts: updatedAccounts, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Slack ─────────────────────────────────────────────────────────────────────

export interface SlackConnection {
    access_token: string;
    team_id: string;
    team_name: string;
    user_id: string;
    connected_at: string;
}

/**
 * Retrieves the Slack connection for the user (stored by the OAuth callback server-side).
 * Stored in: users/{uid}/tokens/slack
 */
export async function getSlackConnection(uid: string): Promise<SlackConnection | null> {
    if (!uid) return null;
    const ref = doc(db, "users", uid, "tokens", "slack");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data() as SlackConnection;
    }
    return null;
}

/**
 * Disconnects Slack by removing the token document.
 */
export async function disconnectSlack(uid: string) {
    if (!uid) return;
    const { deleteDoc } = await import("firebase/firestore");
    const ref = doc(db, "users", uid, "tokens", "slack");
    await deleteDoc(ref);
}

// ─── Microsoft ─────────────────────────────────────────────────────────────────

export interface MicrosoftConnection {
    access_token: string;
    refresh_token: string;
    user_id: string;
    email: string;
    display_name: string;
    connected_at: string;
}

/**
 * Retrieves the Microsoft connection for the user.
 * Stored in: users/{uid}/tokens/microsoft
 */
export async function getMicrosoftConnection(uid: string): Promise<MicrosoftConnection | null> {
    if (!uid) return null;
    const ref = doc(db, "users", uid, "tokens", "microsoft");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data() as MicrosoftConnection;
    }
    return null;
}

/**
 * Disconnects Microsoft by removing the token document.
 */
export async function disconnectMicrosoft(uid: string) {
    if (!uid) return;
    const { deleteDoc } = await import("firebase/firestore");
    const ref = doc(db, "users", uid, "tokens", "microsoft");
    await deleteDoc(ref);
}

