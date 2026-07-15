"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { getFirebaseDb } from "@/lib/firebase";

interface PlanGateProps {
  children: ReactNode;
}

export default function PlanGate({
  children,
}: PlanGateProps) {
  const router = useRouter();
  const { user, checked } = useFirebaseUser();

  const [authorized, setAuthorized] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!checked) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    /*
     * On copie l’UID dans une constante.
     * TypeScript sait alors qu’il s’agit forcément d’une string,
     * même à l’intérieur de la fonction asynchrone.
     */
    const userId = user.uid;

    let cancelled = false;

    async function verifyPlanSelection() {
      try {
        const userRef = doc(
          getFirebaseDb(),
          "users",
          userId
        );

        const snapshot = await getDoc(userRef);

        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          router.replace("/pricing");
          return;
        }

        const profile = snapshot.data();

        const onboardingCompleted =
          profile.onboardingCompleted === true;

        if (!onboardingCompleted) {
          router.replace("/pricing");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error(
          "[PlanGate] Impossible de vérifier le plan :",
          error
        );

        if (!cancelled) {
          router.replace("/pricing");
        }
      } finally {
        if (!cancelled) {
          setProfileChecked(true);
        }
      }
    }

    void verifyPlanSelection();

    return () => {
      cancelled = true;
    };
  }, [checked, user, router]);

  if (!checked || !profileChecked || !authorized) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/20 border-t-[#1ed760]" />

          <p className="mt-4 text-sm text-white/60">
            Vérification de ton compte…
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}