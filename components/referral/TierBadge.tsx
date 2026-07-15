import { Sprout, Paintbrush, Megaphone } from "lucide-react";
import type { UserTier } from "@/types/referral";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<UserTier, { icon: typeof Sprout; classes: string }> = {
  explorer: { icon: Sprout, classes: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  creator: { icon: Paintbrush, classes: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  ambassador: { icon: Megaphone, classes: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
};

export default function TierBadge({
  tier,
  label,
  className,
}: {
  tier: UserTier;
  label: string;
  className?: string;
}) {
  const { icon: Icon, classes } = TIER_STYLE[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        classes,
        className
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
