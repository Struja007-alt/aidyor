import { Link } from "react-router-dom";

const chains = [
  "Ethereum",
  "BNB Chain",
  "Solana",
  "Polygon",
  "Arbitrum",
  "Base",
  "Avalanche",
  "Fantom",
  "Optimism",
];

const products = [
  {
    title: "Web app",
    text: "Paste a token address and get a risk report in seconds. No wallet connection and no signup needed for core scanning.",
  },
  {
    title: "Browser extension",
    text: "Check tokens without leaving the page you're on.",
  },
  {
    title: "Telegram bot",
    text: "Scan tokens straight from chat with @AIDYOR_BOT, including inline mode in groups.",
  },
  {
    title: "B2B API",
    text: "Add token risk checks to your own wallet, bot, or trading product.",
  },
];

const checks = [
  "Honeypot behavior (tokens you can buy but not sell)",
  "Rug pull indicators such as unlocked liquidity and owner privileges",
  "Holder concentration and distribution",
  "Contract red flags and scam patterns",
  "Screenshot (OCR) detection: upload a screenshot and AIDYOR finds the token for you",
];

const About = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About AIDYOR
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          AIDYOR is an AI-powered crypto token security scanner. It helps you
          spot honeypots, rug pulls, and scam tokens before you put money into
          them.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Why we built it</h2>
        <p className="text-muted-foreground">
          New tokens launch every minute, and many exist only to take your
          money. Checking a contract by hand takes time and technical skill that
          most people don't have. AIDYOR does that analysis for you and shows
          the result in plain language, so you can decide with more
          information.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">What we check</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          {checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Supported networks</h2>
        <div className="flex flex-wrap gap-2">
          {chains.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Where to use AIDYOR</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-border p-4"
            >
              <h3 className="mb-1 font-semibold">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Who's behind it</h2>
        <p className="text-muted-foreground">
          AIDYOR is built by an independent founder based in Croatia. The
          product is developed and maintained in the open with one goal: making
          it harder for scammers to profit from people who can't easily verify
          what they're buying.
        </p>
      </section>

      <section className="mb-10 rounded-lg border border-border p-4">
        <h2 className="mb-2 text-lg font-semibold">An honest limitation</h2>
        <p className="text-sm text-muted-foreground">
          AIDYOR reports risk signals based on available on-chain data. It
          cannot guarantee that a token is safe, and a clean result is not
          financial advice. Tokens with very little data, such as brand-new
          ones with few holders, deserve extra caution. Always do your own
          research.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground"
        >
          Scan a token
        </Link>
        <a
          href="https://t.me/AIDYOR_BOT"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 font-medium"
        >
          Open Telegram bot
        </a>
      </div>
    </main>
  );
};

export default About;