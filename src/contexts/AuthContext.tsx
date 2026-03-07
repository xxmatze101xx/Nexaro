"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfileDoc } from "@/lib/user";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Ensure a Firestore user document exists on every login
                await createUserProfileDoc(currentUser.uid, {
                    email: currentUser.email ?? "",
                    displayName: currentUser.displayName ?? "",
                    photoURL: currentUser.photoURL ?? "",
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}
