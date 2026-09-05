"use client";
import { useEffect, useState } from "react";
import { Building2, Eye, Plus, X } from "lucide-react";
import { shortLetOperatorsApi } from "@/lib/api";
import {
  ListingStatus,
  OperatorPortalStatus,
  Property,
  ShortLetOperator,
  ShortLetOperatorStatus,
} from "@/types";
import { useToast } from "@/components/ui/Toast";

const empty = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  websiteUrl: "",
  status: ShortLetOperatorStatus.PENDING,
};
export default function AdminShortLetOperatorsPage() {
  const [items, setItems] = useState<ShortLetOperator[]>([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<
    (Partial<ShortLetOperator> & { name: string; phone: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listingOperator, setListingOperator] = useState<ShortLetOperator | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const { success, error } = useToast();
  const load = async () => {
    setLoading(true);
    try {
      const response = await shortLetOperatorsApi.adminList(filter);
      setItems(response.data);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Unable to load operators");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [filter]);
  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        contactPerson: form.contactPerson?.trim() || undefined,
        email: form.email?.trim() || undefined,
        websiteUrl: form.websiteUrl?.trim() || undefined,
        status: form.status,
      };
      form.id
        ? await shortLetOperatorsApi.update(form.id, payload)
        : await shortLetOperatorsApi.create(payload);
      success("Operator saved");
      setForm(null);
      load();
    } catch (e: any) {
      error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const viewListings = async (operator: ShortLetOperator) => {
    setListingOperator(operator);
    setListings([]);
    try {
      const response = await shortLetOperatorsApi.listings(operator.id);
      setListings(response.data);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Unable to load associated listings");
    }
  };
  const updatePortalStatus = async (item: ShortLetOperator) => {
    const next = item.portalStatus === OperatorPortalStatus.ACTIVE
      ? OperatorPortalStatus.DEACTIVATED
      : OperatorPortalStatus.ACTIVE;
    try {
      await shortLetOperatorsApi.setPortalStatus(item.id, next);
      success(`Portal access ${next === OperatorPortalStatus.ACTIVE ? "activated" : "deactivated"}`);
      await load();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Unable to update portal access");
    }
  };
  const status = async (id: string, value: string) => {
    try {
      await shortLetOperatorsApi.setStatus(id, value);
      load();
    } catch (e: any) {
      error(e.message);
    }
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            Short Let Operators
          </h1>
          <p className="text-sm text-veriq-muted">
            Approve operators and manage the master directory.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setForm(empty)}
        >
          <Plus className="h-4 w-4" />
          Add operator
        </button>
      </div>
      <div className="flex gap-3">
        <select
          className="input max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.values(ShortLetOperatorStatus).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <span>Operator</span>
          <span>Contact</span>
          <span>Approval</span>
          <span>Portal</span>
          <span>Action</span>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading operators...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No operators found.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] items-center gap-4 border-b px-5 py-4 text-sm last:border-0"
            >
              <div>
                <p className="font-semibold text-navy-900">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.websiteUrl || "No website"}
                </p>
              </div>
              <div>
                <p>{item.contactPerson || "Not provided"}</p>
                <p className="text-xs text-slate-500">{item.phone}</p>
              </div>
              <select
                className="input !py-2"
                value={item.status}
                onChange={(e) => status(item.id, e.target.value)}
              >
                {Object.values(ShortLetOperatorStatus).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="capitalize">
                {item.portalStatus.replace("_", " ")}
              </span>
              <div className="flex gap-2">
                <button className="btn-outline !px-3 !py-2" title="View associated listings" onClick={() => viewListings(item)}><Eye className="h-4 w-4" /></button>
                {item.portalStatus !== OperatorPortalStatus.NOT_CREATED && <button className="btn-outline !px-3 !py-2" onClick={() => updatePortalStatus(item)}>{item.portalStatus === OperatorPortalStatus.ACTIVE ? "Disable portal" : "Enable portal"}</button>}
                <button className="btn-outline !px-3 !py-2" onClick={() => setForm({ ...empty, ...item, id: item.id })}>Edit</button>
              </div>
            </div>
          ))
        )}
      </div>
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {form.id ? "Edit" : "Add"} operator
              </h2>
              <button onClick={() => setForm(null)}>
                <X />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Operator name *"],
                ["contactPerson", "Contact person"],
                ["phone", "Phone number *"],
                ["email", "Email address"],
                ["websiteUrl", "Website / booking URL"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className={key === "websiteUrl" ? "sm:col-span-2" : ""}
                >
                  <span className="label">{label}</span>
                  <input
                    className="input"
                    type={
                      key === "email"
                        ? "email"
                        : key === "websiteUrl"
                          ? "url"
                          : "text"
                    }
                    value={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              disabled={saving || !form.name || !form.phone}
              onClick={save}
              className="btn-primary mt-6 w-full"
            >
              {saving ? "Saving..." : "Save operator"}
            </button>
          </div>
        </div>
      )}
      {listingOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="font-display text-lg font-bold">{listingOperator.name}</h2><p className="text-sm text-slate-500">Associated Short Let listings</p></div>
              <button title="Close" onClick={() => setListingOperator(null)}><X /></button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {listings.length === 0 ? <p className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">No listings are associated with this operator.</p> : listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
                  <div><p className="font-semibold text-navy-900">{listing.title}</p><p className="text-xs text-slate-500">{listing.area}, {listing.city}</p></div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${listing.status === ListingStatus.ACTIVE ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{listing.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
