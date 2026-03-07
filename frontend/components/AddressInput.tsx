'use client';

const DEMO_ADDRESSES = [
  { label: 'Imperial Beach', value: '800 Seacoast Dr, Imperial Beach, CA' },
  { label: 'Pacific Beach', value: '4500 Ocean Blvd, Pacific Beach, CA' },
  { label: 'Ocean Beach', value: '4975 Voltaire St, Ocean Beach, CA' },
  { label: 'Del Mar (low risk)', value: '2650 Del Mar Heights Rd, Del Mar, CA' },
  { label: 'Downtown SD', value: '1600 Pacific Hwy, San Diego, CA' },
];

interface Props {
  address: string;
  setAddress: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDemoSelect: (addr: string) => void;
}

export default function AddressInput({ address, setAddress, loading, onSubmit, onDemoSelect }: Props) {
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Enter any San Diego address..."
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-400 text-xs">Try:</span>
        {DEMO_ADDRESSES.map(d => (
          <button
            key={d.value}
            type="button"
            disabled={loading}
            onClick={() => {
              setAddress(d.value);
              onDemoSelect(d.value);
            }}
            className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-full transition-colors"
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
