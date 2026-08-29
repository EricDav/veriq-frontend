type MoneyValue = number | string | null | undefined;

interface MoveInEstimateProps {
  rentAmount: MoneyValue;
  agencyFee: MoneyValue;
  serviceCharge: MoneyValue;
  legalFee: MoneyValue;
  cautionFee: MoneyValue;
  inspectionFee: MoneyValue;
  totalMoveInEstimate: MoneyValue;
}

function formatNaira(value: MoneyValue) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

export function MoveInEstimate(props: MoveInEstimateProps) {
  const costs = [
    { label: 'Annual Rent', value: props.rentAmount },
    { label: 'Agency Fee', value: props.agencyFee },
    { label: 'Service Charge', value: props.serviceCharge },
    { label: 'Legal Fee', value: props.legalFee },
    { label: 'Caution Fee', value: props.cautionFee },
    { label: 'Inspection Fee', value: props.inspectionFee },
  ].filter(({ value }) => Number(value) > 0);

  if (!costs.length && Number(props.totalMoveInEstimate) <= 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-veriq-surface px-4 py-5 sm:px-5" aria-labelledby="move-in-estimate-title">
      <h3 id="move-in-estimate-title" className="mb-4 flex items-center gap-2 font-semibold text-navy-900">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-sm font-black text-veriq-secondary" aria-hidden="true">₦</span>
        Move-in Estimate
      </h3>

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {costs.map(({ label, value }) => (
          <div key={label} className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200/80 py-2 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
            <dt className="text-sm leading-5 text-slate-600">{label}</dt>
            <dd className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-navy-900">
              {formatNaira(value)}
            </dd>
          </div>
        ))}
      </dl>

      {Number(props.totalMoveInEstimate) > 0 && (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t-2 border-slate-300 pt-4">
          <span className="text-sm font-bold text-navy-900">Total move-in</span>
          <strong className="whitespace-nowrap text-right text-base font-black tabular-nums text-navy-900">
            {formatNaira(props.totalMoveInEstimate)}
          </strong>
        </div>
      )}
    </section>
  );
}
