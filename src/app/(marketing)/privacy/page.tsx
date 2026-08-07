import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Gray Yachts",
  description:
    "How Gray Yachts collects, uses, and protects information submitted through our yacht valuation request and contact forms.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 text-[#f1f5f9]">
      <header className="mb-12 border-b border-[#1e293b] pb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A96E]">
          Gray Yachts
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-5xl font-light">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-[#8892A5]">
          Effective date: August 7, 2026 · Last updated: August 7, 2026
        </p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-[#cbd5e1]">
        <p>
          This Privacy Policy describes how Gray Yachts LLC (&ldquo;Gray
          Yachts,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) collects, uses, and shares information when you
          visit our websites or submit a yacht valuation request, listing
          enquiry, or contact form.
        </p>
        <p>
          We do not sell or rent your personal information. We do not share it
          with other brokers or third-party marketers.
        </p>

        <Section title="Information you give us">
          <p>
            When you request a yacht valuation or contact us, we collect what
            you enter in the form:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Your name, email address, and phone number.</li>
            <li>
              Details about your vessel — year, make and model, length,
              condition, and your timeframe for selling.
            </li>
            <li>
              Anything else you choose to include in a message to us.
            </li>
          </ul>
        </Section>

        <Section title="Information collected automatically">
          <p>
            When you arrive from an advertisement or a link, we record how you
            got here so we can understand which of our campaigns are working:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              Campaign parameters in the link you clicked (commonly labelled
              <code className="mx-1 rounded bg-[#0f172a] px-1.5 py-0.5 text-[13px]">
                utm_source
              </code>
              ,
              <code className="mx-1 rounded bg-[#0f172a] px-1.5 py-0.5 text-[13px]">
                utm_campaign
              </code>
              and similar), the referring website, and the page you landed on.
            </li>
            <li>
              A Meta (Facebook) click identifier and advertising cookies, where
              our advertising pixel is active.
            </li>
          </ul>
          <p className="mt-3">
            This information is stored in your browser for the duration of your
            visit and submitted alongside your enquiry. We do not use it to
            build a profile of you across unrelated websites.
          </p>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              To prepare and send the valuation or information you asked for.
            </li>
            <li>
              To contact you about your vessel, your enquiry, and — if you
              become a client — your listing.
            </li>
            <li>
              To measure which advertisements produce genuine enquiries so we
              can spend our advertising budget sensibly.
            </li>
          </ul>
        </Section>

        <Section title="Calls, texts, and email">
          <p>
            When you submit a valuation request and provide a phone number, you
            agree that Gray Yachts may contact you by phone, text message, and
            email about that request. Some of these messages are sent
            automatically. Message and data rates may apply. You can stop text
            messages at any time by replying <strong>STOP</strong>, and you can
            ask us to stop contacting you entirely by replying to any email or
            writing to the address below. Consent to receive texts is not a
            condition of any purchase or of engaging our brokerage services —
            tell us and we will use email only.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            We share your information only with the service providers that make
            our business run, and only so they can perform that service for us:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Form and email delivery.</strong> Our valuation forms are
              delivered by Formspree, and our email is hosted by Google. Your
              submission passes through and is stored by those services.
            </li>
            <li>
              <strong>Advertising measurement.</strong> Where our Meta pixel is
              active, Meta Platforms receives a signal that an enquiry occurred,
              together with the advertising identifiers described above.
            </li>
            <li>
              <strong>Brokerage partners.</strong> Gray Yachts works alongside
              Jeff Brown Yachts. If your enquiry concerns a vessel or
              transaction handled jointly, your details may be shared with that
              brokerage so your enquiry can be answered properly.
            </li>
            <li>
              <strong>When the law requires it,</strong> or to establish or
              defend a legal claim.
            </li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep valuation enquiries for as long as needed to answer them and
            to maintain our records of the vessels and owners we have worked
            with — ordinarily up to seven years, which reflects how long a
            boat-owning relationship tends to run and the records a brokerage is
            expected to retain. You can ask us to delete your information sooner
            and we will, unless we are required to keep it.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Ask us what we hold about you, or ask us to correct or delete it.
            </li>
            <li>Reply STOP to any text, or ask us to stop emailing.</li>
            <li>
              Block or clear advertising cookies in your browser, and adjust ad
              settings in your Meta account.
            </li>
          </ul>
          <p className="mt-3">
            Washington and California residents have additional rights over
            personal information under state law, including the right to know
            what we have collected and to request deletion. Write to us at the
            address below and we will honour those requests.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Enquiries are transmitted over encrypted connections and held in
            access-controlled accounts. No method of transmission or storage is
            completely secure, so we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Our services are intended for adults. We do not knowingly collect
            information from anyone under 18.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we change this policy we will update the date at the top of this
            page. Material changes will be described here.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, or a request about your information — email{" "}
            <a
              className="text-[#C9A96E] underline underline-offset-4"
              href="mailto:connor@grayyachts.com"
            >
              connor@grayyachts.com
            </a>
            .
          </p>
          <p className="mt-3">Gray Yachts LLC · Seattle, Washington</p>
        </Section>

        <p className="border-t border-[#1e293b] pt-8 text-sm text-[#8892A5]">
          Looking for the privacy policy for the JBY-Marine Tech app?{" "}
          <Link
            className="text-[#C9A96E] underline underline-offset-4"
            href="/marine-tech/privacy"
          >
            It is here
          </Link>
          .
        </p>
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
