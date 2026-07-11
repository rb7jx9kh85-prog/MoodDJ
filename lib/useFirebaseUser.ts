"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

/** Reactive Firebase auth state. `checked` is false until the first callback fires. */
export function useFirebaseUser(): { user: User | null; checked: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setChecked(true);
    });
    return unsubscribe;
  }, []);

  return { user, checked };
}
