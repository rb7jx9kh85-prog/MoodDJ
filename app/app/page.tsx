import MoodDJApp from "@/components/MoodDJApp";
import PlanGate from "@/components/PlanGate";

import { isConnected } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const connected = await isConnected();
  const params = await searchParams;

  const authError =
    typeof params.error === "string"
      ? params.error
      : undefined;

  return (
    <PlanGate>
      <MoodDJApp
        initialConnected={connected}
        authError={authError}
      />
    </PlanGate>
  );
}