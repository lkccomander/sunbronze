import Link from "next/link";

import legalPagesData from "@/content/legal-pages.json";

type LegalLocale = "en" | "es";
type LegalPageKind = "privacyPolicy" | "termsOfService";

type LegalSection = {
  heading: string;
  body?: string[];
  items?: string[];
  email?: string;
};

type LegalContent = {
  title: string;
  brand: string;
  lastUpdated: string;
  effectiveStatement: string;
  sections: LegalSection[];
};

type LegalPages = Record<LegalPageKind, Record<LegalLocale, LegalContent>>;

type LegalPageProps = {
  kind: LegalPageKind;
  locale: LegalLocale;
};

const legalPages = legalPagesData as LegalPages;

const labelByLocale = {
  en: {
    back: "Back to sign in",
    lastUpdated: "Last updated",
    alternate: "Español",
  },
  es: {
    back: "Volver al inicio de sesión",
    lastUpdated: "Última actualización",
    alternate: "English",
  },
} as const;

const alternateHrefByPage = {
  privacyPolicy: {
    en: "/privacy",
    es: "/privacy-en",
  },
  termsOfService: {
    en: "/terms-of-service",
    es: "/terms-of-service-en",
  },
} as const;

export function LegalPage({ kind, locale }: LegalPageProps) {
  const page = legalPages[kind][locale];
  const labels = labelByLocale[locale];
  const alternateHref = alternateHrefByPage[kind][locale];

  return (
    <main id="main" className="min-h-screen bg-[var(--color-background)] px-6 py-12 text-[var(--color-on-surface)]">
      <article className="legal-document mx-auto max-w-4xl">
        <header className="legal-document-header">
          <div>
            <p className="stat-label">{page.brand}</p>
            <h1 className="page-title mt-3">{page.title}</h1>
            <p className="page-subtitle">
              {labels.lastUpdated}: {page.lastUpdated}
            </p>
          </div>
          <nav className="legal-document-actions" aria-label={page.title}>
            <Link className="btn btn-ghost btn-sm" href="/login">
              {labels.back}
            </Link>
            <Link className="btn btn-secondary btn-sm" href={alternateHref}>
              {labels.alternate}
            </Link>
          </nav>
        </header>

        <div className="legal-document-body">
          {page.sections.map((section, index) => (
            <section className="legal-section" key={section.heading}>
              <h2>
                {index + 1}. {section.heading}
              </h2>
              {section.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.email ? (
                <p>
                  <a href={`mailto:${section.email}`}>{section.email}</a>
                </p>
              ) : null}
            </section>
          ))}
          <p className="legal-effective">{page.effectiveStatement}</p>
        </div>
      </article>
    </main>
  );
}
