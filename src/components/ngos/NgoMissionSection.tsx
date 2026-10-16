import type { NgoPublicProfile } from "@/features/ngos/types";
import { NgoSection } from "./NgoSection";

export function NgoMissionSection({ ngo }: { ngo: NgoPublicProfile }) {
  return (
    <NgoSection title="Mission">
      <p className="whitespace-pre-line">{ngo.mission}</p>
      {ngo.activitiesDescription && (
        <>
          <h3 className="pt-2 font-medium">What we do</h3>
          <p className="whitespace-pre-line">{ngo.activitiesDescription}</p>
        </>
      )}
      {ngo.targetBeneficiaries && (
        <>
          <h3 className="pt-2 font-medium">Who we help</h3>
          <p className="whitespace-pre-line">{ngo.targetBeneficiaries}</p>
        </>
      )}
    </NgoSection>
  );
}
