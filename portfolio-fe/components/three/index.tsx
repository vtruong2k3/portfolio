// Dynamic wrappers for all R3F scenes — always SSR:false (Req 9.3)
// Import these instead of the raw components to avoid SSR errors.
import dynamic from "next/dynamic";

export const HeroSceneDynamic = dynamic(
  () => import("./HeroScene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    ),
  }
);

export const SkillsCloudDynamic = dynamic(
  () => import("./SkillsCloud").then((m) => m.SkillsCloud),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] flex items-center justify-center" aria-hidden="true">
        <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    ),
  }
);
