'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  onSnapshot, 
  getDocFromServer,
  deleteField,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { BookingRecord, TimeSlot, WhatsAppMessageTemplate } from './booking-store';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID if specified
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider with Google Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/documents');

// In-memory token management
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Test Firestore connection on module load
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using offline persistence cache.');
    }
  });
}

export function initAuth(
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string | null } | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export async function logoutUser() {
  await signOut(auth);
  cachedAccessToken = null;
}

// ==========================================
// Firestore Persistence Helpers
// ==========================================

function sanitizeForFirestore(data: any, isTopLevel = true): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map((item) => (item === undefined ? null : sanitizeForFirestore(item, false)));
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) {
        cleaned[k] = isTopLevel ? deleteField() : null;
      } else {
        cleaned[k] = sanitizeForFirestore(v, false);
      }
    }
    return cleaned;
  }
  return data;
}

export function sanitizeSlotForFirestore(slot: TimeSlot): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [k, v] of Object.entries(slot)) {
    if (v === undefined) {
      cleaned[k] = deleteField();
    } else if (v !== null) {
      cleaned[k] = v;
    }
  }

  // Ensure updatedAt is always set
  cleaned.updatedAt = slot.updatedAt || new Date().toISOString();

  // If slot is available, explicitly guarantee bookingId and bookedByStudentName are deleted if not provided
  if (slot.status === 'available') {
    if (!slot.bookingId) {
      cleaned.bookingId = deleteField();
    }
    if (!slot.bookedByStudentName) {
      cleaned.bookedByStudentName = deleteField();
    }
  }

  return cleaned;
}

export async function saveBookingToFirestore(booking: BookingRecord) {
  try {
    const bookingRef = doc(db, 'bookings', booking.id);
    const cleaned = sanitizeForFirestore({
      ...booking,
      updatedAt: new Date().toISOString()
    });
    await setDoc(bookingRef, cleaned, { merge: true });
  } catch (e) {
    console.error('Failed to save booking to Firestore:', e);
  }
}

export async function getBookingsFromFirestore(): Promise<BookingRecord[]> {
  try {
    const colRef = collection(db, 'bookings');
    const snapshot = await getDocs(colRef);
    const list: BookingRecord[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as BookingRecord);
    });
    return list;
  } catch (e) {
    console.error('Failed to get bookings from Firestore:', e);
    return [];
  }
}

export function subscribeToBookings(onUpdate: (bookings: BookingRecord[]) => void) {
  const colRef = collection(db, 'bookings');
  return onSnapshot(colRef, (snapshot) => {
    const list: BookingRecord[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as BookingRecord);
    });
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    console.warn('Firestore snapshot error on bookings:', err);
  });
}

export async function getSlotsFromFirestore(): Promise<TimeSlot[]> {
  try {
    const colRef = collection(db, 'slots');
    const snapshot = await getDocs(colRef);
    const list: TimeSlot[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as TimeSlot);
    });
    return list;
  } catch (e) {
    console.error('Failed to get slots from Firestore:', e);
    return [];
  }
}

export async function saveSingleSlotToFirestore(slot: TimeSlot): Promise<void> {
  try {
    const slotRef = doc(db, 'slots', slot.id);
    const cleaned = sanitizeSlotForFirestore(slot);
    await setDoc(slotRef, cleaned, { merge: true });
  } catch (e) {
    console.error(`Failed to save slot ${slot.id} to Firestore:`, e);
    throw e;
  }
}

export async function deleteSingleSlotFromFirestore(slotId: string): Promise<void> {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await deleteDoc(slotRef);
  } catch (e) {
    console.error(`Failed to delete slot ${slotId} from Firestore:`, e);
    throw e;
  }
}

export async function saveSlotsToFirestore(slots: TimeSlot[]) {
  try {
    const promises = slots.map((slot) => {
      const cleaned = sanitizeSlotForFirestore(slot);
      return setDoc(doc(db, 'slots', slot.id), cleaned, { merge: true });
    });
    await Promise.all(promises);
  } catch (e) {
    console.error('Failed to sync slots to Firestore:', e);
    throw e;
  }
}

export function subscribeToSlots(onUpdate: (slots: TimeSlot[]) => void) {
  const colRef = collection(db, 'slots');
  return onSnapshot(colRef, (snapshot) => {
    const list: TimeSlot[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as TimeSlot);
    });
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    console.warn('Firestore snapshot error on slots:', err);
  });
}

export async function saveTemplatesToFirestore(templates: WhatsAppMessageTemplate[]) {
  try {
    for (const tpl of templates) {
      const cleaned = sanitizeForFirestore(tpl);
      await setDoc(doc(db, 'templates', tpl.id), cleaned, { merge: true });
    }
  } catch (e) {
    console.error('Failed to sync templates to Firestore:', e);
  }
}

export function subscribeToTemplates(onUpdate: (templates: WhatsAppMessageTemplate[]) => void) {
  const colRef = collection(db, 'templates');
  return onSnapshot(colRef, (snapshot) => {
    const list: WhatsAppMessageTemplate[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as WhatsAppMessageTemplate);
    });
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (err) => {
    console.warn('Firestore snapshot error on templates:', err);
  });
}
