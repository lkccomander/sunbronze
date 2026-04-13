"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import barberServiceImage from "@/app/assets/barberia4.png";
import tanningServiceImage from "@/app/assets/bronceado.png";
import type { ServiceSummary } from "@/lib/api";

type ServicesCopy = {
  editService: string;
  addOfferingTitle: string;
  addOfferingBody: string;
  unpriced: string;
  barber: string;
  resource: string;
};

type CommonCopy = {
  buffer: string;
  none: string;
};

const serviceImages: Record<string, StaticImageData> = {
  corte: barberServiceImage,
  "sesion-bronceado": tanningServiceImage,
};

function serviceImageFor(code: string): StaticImageData {
  return serviceImages[code] ?? tanningServiceImage;
}

function formatPrice(service: ServiceSummary, unpriced: string): string {
  if (service.price_cents === null) {
    return unpriced;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency_code,
  }).format(service.price_cents / 100);
}

export function ServicesManager({
  initialServices,
  copy,
  common,
}: {
  initialServices: ServiceSummary[];
  copy: ServicesCopy;
  common: CommonCopy;
}) {
  return (
    <div className="grid gap-5">
      <div className="service-card-grid">
        <Link href="/services/new" className="service-add-card">
          <span className="service-add-icon">+</span>
          <span className="service-add-title">{copy.addOfferingTitle}</span>
          <span className="service-add-body">{copy.addOfferingBody}</span>
        </Link>

        {initialServices.map((service) => (
          <article className="service-offering-card" key={service.id}>
            <div className="service-offering-image">
              <Image
                src={serviceImageFor(service.code)}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
                className="object-cover"
              />
              <span className="service-offering-code">{service.code}</span>
            </div>
            <div className="service-offering-body">
              <div className="flex items-start justify-between gap-4">
                <h3>{service.name}</h3>
                <p className="service-offering-price">{formatPrice(service, copy.unpriced)}</p>
              </div>
              {service.description ? <p className="service-offering-description">{service.description}</p> : null}
              <div className="service-offering-meta">
                <span>{service.duration_minutes} min</span>
                <span>{[service.requires_barber ? copy.barber : null, service.requires_resource ? copy.resource : null].filter(Boolean).join(", ") || common.none}</span>
              </div>
              {service.buffer_before_minutes || service.buffer_after_minutes ? (
                <p className="service-offering-buffer">
                  {common.buffer} {service.buffer_before_minutes}+{service.buffer_after_minutes}
                </p>
              ) : null}
              <div className="service-offering-actions">
                <Link href={`/services/${service.id}/edit`} className="btn btn-secondary btn-sm">
                  {copy.editService}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
