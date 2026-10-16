import DonationForm from "./donation-form";

export default function NewDonationPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Fight World Hunger
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Make a donation
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Choose an organization and enter the amount you would like to give.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <DonationForm />
        </section>
      </div>
    </main>
  );
}
