"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const usd2 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/**
 * Illustrative marine-finance estimator. Standard amortisation:
 *   M = P·r(1+r)^n / ((1+r)^n − 1)
 * Explicitly NOT a loan offer — see the disclaimer at the foot of the card.
 */
export function PaymentCalculator({ price }: { price: number }) {
  const [mode, setMode] = useState<"monthly" | "total">("monthly");
  const [purchase, setPurchase] = useState(price);
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState(6.99);

  const { down, loan, monthly, total, interest } = useMemo(() => {
    const p = Math.max(0, purchase);
    const d = Math.round((p * downPct) / 100);
    const L = Math.max(0, p - d);
    const n = Math.max(1, Math.round(years * 12));
    const r = rate / 100 / 12;
    const m = r === 0 ? L / n : (L * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const t = m * n;
    return { down: d, loan: L, monthly: m, total: t, interest: t - L };
  }, [purchase, downPct, years, rate]);

  const label = "text-[10px] tracking-[0.25em] text-text-secondary";
  const field =
    "mt-2 w-full rounded-lg border border-border bg-bg-primary px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors duration-300 focus:border-gold";

  return (
    <section className="mt-16 rounded-2xl border border-border bg-bg-card p-7 sm:p-9">
      <div className="flex items-center gap-2.5">
        <Calculator size={18} className="text-gold" />
        <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
          Payment Calculator
        </h3>
      </div>

      <div className="mt-6 inline-flex rounded-full border border-border p-1">
        {(["monthly", "total"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-5 py-2 text-[10px] font-semibold tracking-[0.18em] transition-colors duration-300 ${
              mode === m
                ? "bg-gold text-bg-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m === "monthly" ? "MONTHLY PAYMENT" : "TOTAL LOAN COST"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className={label} htmlFor="pc-price">PURCHASE PRICE</label>
            <input
              id="pc-price"
              type="number"
              min={0}
              step={1000}
              value={purchase}
              onChange={(e) => setPurchase(Number(e.target.value))}
              className={field}
            />
          </div>

          <div>
            <label className={label} htmlFor="pc-down">
              DOWN PAYMENT ({downPct}%) — {usd(down)}
            </label>
            <input
              id="pc-down"
              type="range"
              min={0}
              max={80}
              step={1}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="mt-3 w-full accent-[#C9A96E]"
            />
          </div>

          <div>
            <p className={label}>LOAN AMOUNT</p>
            <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
              {usd(loan)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="pc-years">TERM (YEARS)</label>
              <input
                id="pc-years"
                type="number"
                min={1}
                max={30}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="pc-rate">INTEREST RATE (%)</label>
              <input
                id="pc-rate"
                type="number"
                min={0}
                max={30}
                step={0.01}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className={field}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-primary p-7 text-center">
          <p className="text-[10px] tracking-[0.25em] text-text-secondary">
            {mode === "monthly" ? "ESTIMATED MONTHLY PAYMENT" : "TOTAL OF PAYMENTS"}
          </p>
          <p className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light text-gold sm:text-5xl">
            {mode === "monthly" ? usd2(monthly) : usd(total)}
          </p>
          {mode === "total" && (
            <p className="mt-3 text-xs text-text-secondary">
              {usd(interest)} of that is interest
            </p>
          )}
          <p className="mt-5 max-w-xs text-xs leading-relaxed text-text-secondary">
            Adjust the term, down payment and rate to see how each changes the
            figure.
          </p>
        </div>
      </div>

      <p className="mt-7 border-t border-border pt-5 text-[11px] leading-relaxed text-text-secondary">
        For illustrative purposes only. This is not a loan offer,
        pre-qualification, or commitment to lend, and Gray Yachts is not a
        lender. Actual rates, terms and eligibility vary by lender and
        borrower. Consult a qualified marine lender for financing options.
      </p>
    </section>
  );
}
