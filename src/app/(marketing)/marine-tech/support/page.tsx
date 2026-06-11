import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — JBY-Marine Tech | Gray Yachts",
  description:
    "Support and help for the JBY-Marine Tech mobile app. Common questions and contact information.",
};

export default function MarineTechSupportPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 text-[#f1f5f9]">
      <header className="mb-12 border-b border-[#1e293b] pb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A96E]">
          JBY-Marine Tech
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-5xl font-light">
          Support
        </h1>
        <p className="mt-4 text-sm text-[#8892A5]">
          Need help with the JBY-Marine Tech app? Start here.
        </p>
      </header>

      <div className="space-y-10 text-[15px] leading-relaxed text-[#cbd5e1]">
        <section>
          <p>
            JBY-Marine Tech is a free field-service app for marine mechanics
            and boat owners. To create an account, tap{" "}
            <em>Create a free account</em> on the sign-in screen and pick your
            account type (Marine Mechanic or Boat Owner).
          </p>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl text-[#f1f5f9]">
            Common questions
          </h2>

          <FAQ q="How do I create an account?">
            From the sign-in screen, tap <em>Create a free account</em>. Choose{" "}
            <em>Marine Mechanic</em> or <em>Boat Owner</em>, enter your email
            and a password, and you&rsquo;ll land in the app with an empty
            workspace.
          </FAQ>

          <FAQ q="Is the app really free?">
            Yes — Marine Tech is completely free. There are no paid tiers, no
            in-app purchases, and no ads. The full feature set is available to
            every account.
          </FAQ>

          <FAQ q="I forgot my password.">
            On the Login screen, tap <em>Forgot password</em>. We&rsquo;ll send
            a reset link to the email associated with your account.
          </FAQ>

          <FAQ q="Photos didn't upload after I submitted a report.">
            The app shows an alert if any photos failed to upload (usually due
            to no network at the dock). Re-open the report from the Clients or
            Jobs tab, re-add the photos, and submit again. The report itself
            was saved.
          </FAQ>

          <FAQ q="The calendar shows the wrong day.">
            Make sure your iPhone&rsquo;s date and time are set to{" "}
            <strong>automatic</strong> in <em>Settings → General → Date &amp;
            Time → Set Automatically</em>.
          </FAQ>

          <FAQ q="I'm offline — what happens?">
            The app queues your edits locally and syncs them when you&rsquo;re
            back online. Look for the orange &ldquo;Offline&rdquo; banner at
            the top.
          </FAQ>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl text-[#f1f5f9]">
            Contact us
          </h2>
          <p className="mt-3">
            For anything else — bugs, feature requests, feedback — email:
          </p>
          <p className="mt-4">
            <a
              href="mailto:connorgray41@gmail.com?subject=Marine%20Tech%20Support"
              className="text-lg text-[#C9A96E] hover:text-[#d4b87e]"
            >
              connorgray41@gmail.com
            </a>
          </p>
          <p className="mt-6">Please include:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>Your iPhone or iPad model</li>
            <li>
              iOS version (Settings → General → About → Software Version)
            </li>
            <li>App version (shown in the Account menu in the app)</li>
            <li>A short description of what happened</li>
            <li>A screenshot or screen recording if you can</li>
          </ul>
          <p className="mt-4 text-sm text-[#8892A5]">
            We respond within 1-2 business days.
          </p>
        </section>

        <section className="border-t border-[#1e293b] pt-8 text-sm text-[#8892A5]">
          <p>
            See also:{" "}
            <Link
              href="/marine-tech/privacy"
              className="text-[#C9A96E] hover:text-[#d4b87e]"
            >
              Marine Tech Privacy Policy
            </Link>
            .
          </p>
          <address className="mt-4 not-italic">
            Gray Yachts LLC
            <br />
            connorgray41@gmail.com
          </address>
        </section>
      </div>
    </article>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-lg text-[#f1f5f9]">{q}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
