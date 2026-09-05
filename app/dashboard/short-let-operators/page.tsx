"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, Plus } from "lucide-react";
import { shortLetOperatorsApi } from "@/lib/api";
import { OperatorPortalStatus, ShortLetOperator } from "@/types";
import { useToast } from "@/components/ui/Toast";

export default function AgentShortLetOperatorsPage() {
  const [items, setItems] = useState<ShortLetOperator[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [credential, setCredential] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const { success, error } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await shortLetOperatorsApi.managed();
      setItems(response.data);
    } catch (caught) {
      error(
        caught instanceof Error
          ? caught.message
          : "Unable to load operator access",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const manageAccess = async (item: ShortLetOperator) => {
    const email = (emails[item.id] || item.email || "").trim();
    if (item.portalStatus === OperatorPortalStatus.NOT_CREATED && !email) {
      error("Enter the operator portal email address.");
      return;
    }
    setWorkingId(item.id);
    try {
      const response =
        item.portalStatus === OperatorPortalStatus.NOT_CREATED
          ? await shortLetOperatorsApi.provision(item.id, email)
          : await shortLetOperatorsApi.reset(item.id);
      setCredential({
        email: response.data.operator.email || email,
        password: response.data.temporaryPassword,
      });
      success(
        item.portalStatus === OperatorPortalStatus.NOT_CREATED
          ? "Restricted operator access created"
          : "Temporary password reset",
      );
      await load();
    } catch (caught) {
      error(
        caught instanceof Error
          ? caught.message
          : "Unable to update operator access",
      );
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Short Let Operator Access
          </h1>
          <p className="text-sm text-veriq-muted">
            Create restricted portal access for approved operators associated
            with your listings.
          </p>
        </div>
        <Link
          href="/dashboard/properties/new"
          className="btn-primary inline-flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Add Short Let listing
        </Link>
      </div>

      {credential && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold">Temporary operator login</p>
          <p className="mt-2">
            Email: <strong>{credential.email}</strong>
          </p>
          <p>
            Password: <strong>{credential.password}</strong>
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Share these credentials securely. The temporary password is
            displayed only here.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading operator access...
          </p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 font-display text-lg font-semibold text-navy-900">
              No associated operators yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Associate an Admin-approved operator while creating or editing a
              Short Let listing. The operator will then appear here for portal
              access.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <section key={item.id} className="border-b p-5 last:border-0">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
                <div>
                  <p className="font-semibold text-navy-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.phone} · {item.associatedListings?.length ?? 0}{" "}
                    associated{" "}
                    {(item.associatedListings?.length ?? 0) === 1
                      ? "listing"
                      : "listings"}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600">
                    Portal: {item.portalStatus.replace("_", " ")}
                  </span>
                </div>
                <label>
                  <span className="label">Portal email</span>
                  <input
                    className="input"
                    type="email"
                    disabled={
                      item.portalStatus !== OperatorPortalStatus.NOT_CREATED
                    }
                    value={emails[item.id] ?? item.email ?? ""}
                    placeholder="operator@company.com"
                    onChange={(event) =>
                      setEmails((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  disabled={workingId === item.id}
                  className="btn-outline flex items-center justify-center gap-2"
                  onClick={() => manageAccess(item)}
                >
                  <KeyRound className="h-4 w-4" />
                  {workingId === item.id
                    ? "Updating..."
                    : item.portalStatus === OperatorPortalStatus.NOT_CREATED
                      ? "Create access"
                      : "Reset access"}
                </button>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  Associated listings
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.associatedListings?.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/dashboard/properties/${listing.id}/edit`}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-navy-700 hover:border-veriq-secondary"
                    >
                      {listing.title}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
