import type { NgoPublicProfile } from "@/features/ngos/types";
import { NgoSection } from "./NgoSection";

export function NgoImpactSection({ ngo }: { ngo: NgoPublicProfile }) {
  const hasContent =
    ngo.projectsSummary || ngo.impactSummary || ngo.keyAchievements.length > 0;
  if (!hasContent) return null;

  return (
    <NgoSection title="Projects and impact">
      {ngo.projectsSummary && (
        <>
          <h3 className="font-medium">Projects and initiatives</h3>
          <p className="whitespace-pre-line">{ngo.projectsSummary}</p>
        </>
      )}
      {ngo.impactSummary && (
        <>
          <h3 className="pt-2 font-medium">Impact</h3>
          <p className="whitespace-pre-line">{ngo.impactSummary}</p>
        </>
      )}
      {ngo.keyAchievements.length > 0 && (
        <>
          <h3 className="pt-2 font-medium">Key achievements</h3>
          <ul className="list-disc space-y-1 pl-5">
            {ngo.keyAchievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </>
      )}
    </NgoSection>
  );
}
