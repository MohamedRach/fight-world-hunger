import "server-only";
import { getNgoRepository, slugify } from "./repository";
import {
  fieldErrorsFromZod,
  ngoCreateSchema,
  ngoUpdateSchema,
} from "./validation";
import {
  toPublicProfile,
  type Ngo,
  type NgoPublicProfile,
} from "./types";

export type NgoServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE_NGO";

export class NgoServiceError extends Error {
  readonly code: NgoServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: NgoServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "NgoServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Slug derived from the name, suffixed (-2, -3…) when already taken. */
async function uniqueSlug(name: string): Promise<string> {
  const repo = getNgoRepository();
  const base = slugify(name) || "ngo";
  let candidate = base;
  for (let suffix = 2; await repo.findByIdOrSlug(candidate); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function getPublicNgoProfile(
  idOrSlug: string,
): Promise<NgoPublicProfile | null> {
  const ngo = await getNgoRepository().findByIdOrSlug(idOrSlug);
  return ngo ? toPublicProfile(ngo) : null;
}

export async function createNgo(
  userId: string | null,
  input: unknown,
): Promise<NgoPublicProfile> {
  if (!userId) {
    throw new NgoServiceError("UNAUTHENTICATED", "You must be signed in to create an NGO profile.");
  }

  const parsed = ngoCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new NgoServiceError(
      "VALIDATION_ERROR",
      "The submitted NGO profile is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  const repo = getNgoRepository();
  if (await repo.findByName(data.name)) {
    throw new NgoServiceError("DUPLICATE_NGO", "An NGO with this name already exists.", {
      name: ["An NGO with this name already exists."],
    });
  }
  if (data.registrationId && (await repo.findByRegistrationId(data.registrationId))) {
    throw new NgoServiceError(
      "DUPLICATE_NGO",
      "An NGO with this registration identifier already exists.",
      { registrationId: ["An NGO with this registration identifier already exists."] },
    );
  }

  const ngo = await repo.create({
    slug: await uniqueSlug(data.name),
    name: data.name,
    logoUrl: data.logoUrl ?? null,
    shortDescription: data.shortDescription,
    mission: data.mission,
    activitiesDescription: data.activitiesDescription ?? null,
    targetBeneficiaries: data.targetBeneficiaries ?? null,
    yearFounded: data.yearFounded ?? null,
    registrationId: data.registrationId ?? null,
    website: data.website ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    socialLinks: data.socialLinks ?? null,
    primaryCause: data.primaryCause,
    otherCauses: data.otherCauses,
    hqCountryCode: data.hqCountryCode,
    hqCity: data.hqCity ?? null,
    operatingCountryCodes: data.operatingCountryCodes,
    projectsSummary: data.projectsSummary ?? null,
    impactSummary: data.impactSummary ?? null,
    keyAchievements: data.keyAchievements,
    verificationStatus: "PENDING",
    createdByUserId: userId,
  });
  await repo.addMembership(userId, ngo.id, "OWNER");

  return toPublicProfile(ngo);
}

export async function updateNgo(
  userId: string | null,
  ngoId: string,
  input: unknown,
): Promise<NgoPublicProfile> {
  if (!userId) {
    throw new NgoServiceError("UNAUTHENTICATED", "You must be signed in to edit an NGO profile.");
  }

  const repo = getNgoRepository();
  const ngo = await repo.findByIdOrSlug(ngoId);
  if (!ngo) {
    throw new NgoServiceError("NOT_FOUND", "NGO not found.");
  }

  const membership = await repo.findMembership(userId, ngo.id);
  if (!membership) {
    throw new NgoServiceError(
      "FORBIDDEN",
      "You are not authorized to manage this NGO's profile.",
    );
  }

  const parsed = ngoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new NgoServiceError(
      "VALIDATION_ERROR",
      "The submitted changes are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  if (data.name && data.name.toLowerCase() !== ngo.name.toLowerCase()) {
    if (await repo.findByName(data.name)) {
      throw new NgoServiceError("DUPLICATE_NGO", "An NGO with this name already exists.", {
        name: ["An NGO with this name already exists."],
      });
    }
  }
  if (data.registrationId && data.registrationId !== ngo.registrationId) {
    if (await repo.findByRegistrationId(data.registrationId)) {
      throw new NgoServiceError(
        "DUPLICATE_NGO",
        "An NGO with this registration identifier already exists.",
        { registrationId: ["An NGO with this registration identifier already exists."] },
      );
    }
  }

  const updated = await repo.update(ngo.id, data);
  return toPublicProfile(updated);
}

/** NGOs the user can manage, for the dashboard. */
export async function getManagedNgos(userId: string | null): Promise<Ngo[]> {
  if (!userId) return [];
  const repo = getNgoRepository();
  const memberships = await repo.findMembershipsByUser(userId);
  const ngos = await Promise.all(memberships.map((m) => repo.findById(m.ngoId)));
  return ngos.filter((ngo): ngo is Ngo => ngo !== null);
}

export async function canManageNgo(userId: string | null, ngoId: string): Promise<boolean> {
  if (!userId) return false;
  const membership = await getNgoRepository().findMembership(userId, ngoId);
  return membership !== null;
}

const COMPLETENESS_FIELDS: Array<{ key: keyof Ngo; label: string }> = [
  { key: "logoUrl", label: "Logo" },
  { key: "activitiesDescription", label: "Description of activities" },
  { key: "targetBeneficiaries", label: "Target beneficiaries" },
  { key: "yearFounded", label: "Year founded" },
  { key: "registrationId", label: "Registration identifier" },
  { key: "website", label: "Official website" },
  { key: "contactEmail", label: "Public contact email" },
  { key: "socialLinks", label: "Social media links" },
  { key: "hqCity", label: "Headquarters city" },
  { key: "projectsSummary", label: "Projects and initiatives" },
  { key: "impactSummary", label: "Impact summary" },
  { key: "keyAchievements", label: "Key achievements" },
];

export type ProfileCompleteness = {
  /** 0–100, counting required fields as always complete. */
  percentage: number;
  missing: string[];
};

export function computeProfileCompleteness(ngo: Ngo): ProfileCompleteness {
  const missing = COMPLETENESS_FIELDS.filter(({ key }) => {
    const value = ngo[key];
    return value === null || (Array.isArray(value) && value.length === 0);
  }).map(({ label }) => label);

  const completed = COMPLETENESS_FIELDS.length - missing.length;
  const percentage = Math.round((completed / COMPLETENESS_FIELDS.length) * 100);
  return { percentage, missing };
}
