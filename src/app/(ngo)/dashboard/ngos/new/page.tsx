import { redirect } from "next/navigation";

// NGO creation now happens through the guided onboarding flow.
export default function NewNgoPage() {
  redirect("/onboarding");
}
