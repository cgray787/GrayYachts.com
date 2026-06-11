import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JBY-Marine Tech — Service & PDI Reports for Marine Mechanics",
  description:
    "Field-service app for marine mechanics and boat owners. Track customer boats, schedule jobs, file checklist-based service reports and pre-delivery inspections with photos.",
};

export default function MarineTechLandingPage() {
  return (
    <article className="text-[#f1f5f9]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1e293b]">
        <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <p className="text-sm uppercase tracking-[0.2em] text-[#C9A96E]">
            JBY-Marine Tech · iPhone &amp; iPad
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-cormorant)] text-5xl font-light leading-tight md:text-6xl">
            Service &amp; PDI reports for marine mechanics — built for the dock.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cbd5e1]">
            Track customer boats, schedule jobs, and file checklist-based
            service or pre-delivery inspection reports with photos. Marine
            Tech is completely free — no paid tiers, no in-app purchases, no
            ads.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/marine-tech/support"
              className="rounded-md bg-[#C9A96E] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#060a12] transition hover:bg-[#d4b87e]"
            >
              Support
            </Link>
            <Link
              href="/marine-tech/privacy"
              className="rounded-md border border-[#1e293b] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#f1f5f9] transition hover:border-[#C9A96E] hover:text-[#C9A96E]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      {/* Account types */}
      <section className="border-b border-[#1e293b] bg-[#0c1220]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light">
            Two account types. Pick yours at signup.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#1e293b] bg-[#111827] p-6">
              <p className="text-sm uppercase tracking-wider text-[#C9A96E]">
                For Mechanics
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl">
                Marine Mechanic
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#cbd5e1]">
                Track customer boats, schedule jobs, and complete
                checklist-based service or pre-delivery inspection (PDI)
                reports with photos. Engine, Electrical, Hull, Safety,
                Navigation — captured in one report and shareable with the
                customer.
              </p>
            </div>
            <div className="rounded-lg border border-[#1e293b] bg-[#111827] p-6">
              <p className="text-sm uppercase tracking-wider text-[#C9A96E]">
                For Owners
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl">
                Boat Owner
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#cbd5e1]">
                Keep a personal service log for your own boats. Photograph
                conditions, log work performed, and have a record ready when
                you sell, insure, or hand off to a captain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-[#1e293b]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light">
            What you get
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            <Feature
              title="Clients & boats"
              body="Add customers, attach the boats you service to each, and store make, model, year, HIN, engine info, and home marina in one place."
            />
            <Feature
              title="Service reports"
              body="Checklist-based reports across Engine, Electrical, Hull, Safety, and Navigation. Mark items BAD/GOOD, attach photos, add notes, and file."
            />
            <Feature
              title="Pre-delivery inspections"
              body="A dedicated PDI flow built around the standard pre-delivery checklist used in marine sales — HIN plates, engine hours, condition shots."
            />
            <Feature
              title="Calendar & jobs"
              body="Schedule jobs by day and time. View tomorrow on the Calendar tab. Open a job, capture the report, mark it complete."
            />
            <Feature
              title="Photos in context"
              body="Attach photos directly to a report — capture with the camera or pick from your library. Photos travel with the record."
            />
            <Feature
              title="Free to use"
              body="Marine Tech is completely free — no paid tiers, no in-app purchases, no ads. The full feature set is available to every account."
            />
          </div>
        </div>
      </section>

      {/* Privacy + permissions */}
      <section className="border-b border-[#1e293b] bg-[#0c1220]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light">
            Privacy you&rsquo;d expect from a service tool
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#cbd5e1]">
            We don&rsquo;t sell your data, run third-party ads, or track you
            across other apps. The only permissions we ask for are{" "}
            <strong>Camera</strong> and <strong>Photo Library</strong> — both
            used inside service reports for photographing boat conditions, HIN
            plates, and engine hours. You can revoke them any time in iOS
            Settings.
          </p>
          <div className="mt-6">
            <Link
              href="/marine-tech/privacy"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              Read the full privacy policy →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light">
            Need help?
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#cbd5e1]">
            Email{" "}
            <a
              href="mailto:connorgray41@gmail.com?subject=Marine%20Tech%20Support"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              connorgray41@gmail.com
            </a>{" "}
            or visit the{" "}
            <Link
              href="/marine-tech/support"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              support page
            </Link>{" "}
            for common questions and what to include in a bug report.
          </p>
          <p className="mt-8 text-sm text-[#8892A5]">
            JBY-Marine Tech is a product of Gray Yachts LLC.
          </p>
        </div>
      </section>
    </article>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-cormorant)] text-2xl text-[#f1f5f9]">
        {title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[#cbd5e1]">{body}</p>
    </div>
  );
}
