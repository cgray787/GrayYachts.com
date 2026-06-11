import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — JBY-Marine Tech | Gray Yachts",
  description:
    "Privacy Policy for the JBY-Marine Tech mobile application — how we collect, use, and protect technician account data and inspection records.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 text-[#f1f5f9]">
      <header className="mb-12 border-b border-[#1e293b] pb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A96E]">
          JBY-Marine Tech
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-5xl font-light">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-[#8892A5]">
          Effective date: April 29, 2026 · Last updated: April 29, 2026
        </p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-[#cbd5e1]">
        <p>
          This Privacy Policy describes how Gray Yachts LLC (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares
          information when you use the JBY-Marine Tech mobile application
          (&ldquo;the App&rdquo;).
        </p>
        <p>
          JBY-Marine Tech is a free, field-service application for marine
          mechanics and boat owners. Anyone can create a free account directly
          in the App. We do not sell or rent your information, and we do not
          use your data for advertising or cross-app tracking.
        </p>

        <Section title="Information we collect">
          <p>When you use the App, we collect the following:</p>

          <h3 className="mt-6 text-lg text-[#f1f5f9]">Account information</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>Email address</strong> — used to sign in and to receive
              account-related communication.
            </li>
            <li>
              <strong>Full name</strong> — displayed in the App and attached to
              reports you submit.
            </li>
            <li>
              <strong>Account type</strong> — selected at signup (Marine
              Mechanic or Boat Owner). Determines which features and tabs you
              see in the App.
            </li>
            <li>
              <strong>Phone number</strong> (optional) — collected only if you
              provide it on your profile.
            </li>
          </ul>

          <h3 className="mt-6 text-lg text-[#f1f5f9]">Work content you create</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>Customer records</strong> — names, emails, phone numbers,
              and addresses of boat owners you service.
            </li>
            <li>
              <strong>Boat records</strong> — vessel details such as make,
              model, year, hull identification number (HIN), engine make/model,
              color, and home marina.
            </li>
            <li>
              <strong>Service reports and pre-delivery inspections</strong> —
              checklists, BAD/GOOD assessments, vessel condition notes, parts,
              work descriptions, and any free-text notes you enter.
            </li>
            <li>
              <strong>Job records</strong> — service types, scheduled dates and
              times, status, and notes.
            </li>
          </ul>

          <h3 className="mt-6 text-lg text-[#f1f5f9]">Photos</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>Inspection photos</strong> — photographs you capture or
              attach within the App, including HIN plates, engine hours,
              before/after condition, and damage. Photos are stored alongside
              the report they are attached to.
            </li>
          </ul>

          <h3 className="mt-6 text-lg text-[#f1f5f9]">Identifiers</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>User ID</strong> — an internal account identifier
              assigned by our authentication provider. Used to attribute
              records you create to your account.
            </li>
          </ul>

          <h3 className="mt-6 text-lg text-[#f1f5f9]">What we do NOT collect</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>We do not collect precise or coarse location data.</li>
            <li>
              We do not collect contacts, microphone, health, or financial
              data.
            </li>
            <li>
              We do not use third-party advertising, analytics, or attribution
              SDKs.
            </li>
            <li>We do not track you across other apps or websites.</li>
          </ul>
        </Section>

        <Section title="Permissions we request">
          <div className="mt-2 overflow-hidden rounded-lg border border-[#1e293b]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0c1220] text-[#C9A96E]">
                <tr>
                  <th className="px-4 py-3 font-medium">Permission</th>
                  <th className="px-4 py-3 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                <tr>
                  <td className="px-4 py-3 font-medium">Camera</td>
                  <td className="px-4 py-3">
                    To photograph boat conditions, HIN plates, and engine hours
                    during inspections.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Photo Library (read)
                  </td>
                  <td className="px-4 py-3">
                    To attach existing photos from your device to a service
                    report.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Photo Library (add)
                  </td>
                  <td className="px-4 py-3">
                    To save inspection photos you take in the App back to your
                    photo library, if you choose.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            You can grant or revoke these permissions at any time in iOS
            Settings → JBY-Marine Tech.
          </p>
        </Section>

        <Section title="How we use information">
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              To authenticate you and operate the App&rsquo;s core features
              (assigned jobs, reports, calendar).
            </li>
            <li>
              To deliver the records you create to the admin dashboard at your
              employer.
            </li>
            <li>To diagnose and fix bugs.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="mt-4">
            We do <strong>not</strong> use your data for advertising, marketing
            personalization, or cross-app tracking.
          </p>
        </Section>

        <Section title="How we share information">
          <p>We share information only as needed to operate the service:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>Within a shop you have joined.</strong> If a shop owner
              invites you onto their team and you accept, the records you
              create as a member of that shop (job reports, customer notes,
              photos) are visible to admin users of that shop. Records created
              in your personal account are not shared with any shop.
            </li>
            <li>
              <strong>With our infrastructure providers.</strong> We use
              Supabase (database, authentication, file storage) and Cloudflare
              (web hosting) as data processors. They process data on our behalf
              under their respective security and privacy commitments and do
              not use it for their own purposes.
            </li>
            <li>
              <strong>When required by law.</strong> We may disclose
              information to comply with valid legal process or to protect the
              rights, property, or safety of our users or others.
            </li>
          </ul>
          <p className="mt-4">
            We do <strong>not</strong> sell your personal information.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain your account information and the records you create for
            as long as your account is active or as needed to provide the
            service. If your account is deactivated, your work content remains
            accessible to your employer (because they own those records). You
            may request deletion of your personal account information by
            emailing the address below.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard practices to protect data, including
            encrypted connections (HTTPS/TLS), encrypted storage at rest, and
            row-level security on our database. No system is perfectly secure;
            please use a strong, unique password.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            The App is not intended for children under 13, and we do not
            knowingly collect personal information from children.
          </p>
        </Section>

        <Section title="Your choices and rights">
          <p>
            Depending on where you live, you may have rights to access,
            correct, delete, or export your personal information. To exercise
            these rights, contact us at the email below. We will respond within
            a reasonable timeframe.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. If we make material
            changes, we will update the &ldquo;Last updated&rdquo; date and,
            where required, notify you in the App or by email.
          </p>
        </Section>

        <Section title="Contact">
          <address className="not-italic">
            Gray Yachts LLC
            <br />
            <a
              href="mailto:connorgray41@gmail.com"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              connorgray41@gmail.com
            </a>
          </address>
          <p className="mt-6 text-sm text-[#8892A5]">
            See also:{" "}
            <Link
              href="/marine-tech/support"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              Marine Tech Support
            </Link>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-cormorant)] text-2xl text-[#f1f5f9]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
