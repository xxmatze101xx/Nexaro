import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";
import { updateUserProfile } from "./user";

const storage = getStorage(app);

/**
 * Uploads a profile picture for a given user and updates their profile document.
 */
export async function uploadProfilePicture(uid: string, file: File): Promise<string> {
    if (!uid || !file) throw new Error("User ID and file are required to upload a profile picture.");

    // Upload to a fixed filename "profile_image" so previous uploads are automatically overwritten
    const storageRef = ref(storage, `profile_pictures/${uid}/profile_image`);

    // Upload the file
    await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update the user's Firestore document
    await updateUserProfile(uid, { photoURL: downloadURL });

    return downloadURL;
}
