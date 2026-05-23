"use client";

// ============================================================================
// Chart Page — Crypto Price Trends + DeFi Hack Event Markers
// ============================================================================
// Loads only pins.json + prices.json. Pins.json is self-contained: each entry
// has date, tag, protocol, description, loss — no separate event JSONs needed.
// Tag colors are hash-based (deterministic from tag string), legend auto-generated.
// ============================================================================

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { ChartPin, PinsData, PricesData } from '@/lib/types';
import { loadPrices, loadPins } from '@/lib/data';
import { IconChevronLeft } from '@/components/Icons';

// ============================================================================
// Constants
// ============================================================================

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend, Filler);

const coinColors: Record<string, { line: string; fill: string }> = {
  ETH: { line: '#627eea', fill: 'rgba(98, 126, 234, 0.1)' },
  BTC: { line: '#f7931a', fill: 'rgba(247, 147, 26, 0.1)' },
  SOL: { line: '#14f195', fill: 'rgba(20, 241, 149, 0.1)' },
};

const coinGeckoIds: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
};

interface LivePrice {
  current: number;
  high24h: number;
  low24h: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ChartPage() {
  const router = useRouter();
  const chartRef = useRef<ChartJS<'line'>>(null);
  const userZoomed = useRef(false);
  const zoomedRangeRef = useRef<{ min: number | string; max: number | string } | null>(null);

  // --- State ---
  const [prices, setPrices] = useState<PricesData | null>(null);
  const [pinsData, setPinsData] = useState<PinsData | null>(null);
  const [currentCoin, setCurrentCoin] = useState('ETH');
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [ready, setReady] = useState(false);
  const [activeRange, setActiveRange] = useState('ALL');
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());

  const toggleTag = useCallback((tag: string) => {
    setHiddenTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  // --- Effects ---

  // Zoom plugin (browser-only dynamic import)
  useEffect(() => {
    import('chartjs-plugin-zoom').then((mod) => {
      ChartJS.register(mod.default);
    });
  }, []);

  // Allow body scrolling (globals.css sets overflow:hidden for calendar page)
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'hidden'; };
  }, []);

  // Load data: only pins.json + prices.json
  useEffect(() => {
    async function init() {
      const [pricesData, pins] = await Promise.all([
        loadPrices(),
        loadPins(),
      ]);
      setPrices(pricesData);
      setPinsData(pins);
      setReady(true);
    }
    init();
  }, []);

  // Live prices from CoinGecko (poll every 60s)
  useEffect(() => {
    async function fetchLive() {
      try {
        const ids = Object.values(coinGeckoIds).join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`
        );
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, LivePrice> = {};
        for (const item of data) {
          map[item.symbol.toUpperCase()] = {
            current: item.current_price,
            high24h: item.high_24h,
            low24h: item.low_24h,
          };
        }
        setLivePrices(map);
      } catch (e) {
        console.error('Live price fetch failed:', e);
      }
    }
    fetchLive();
    const id = setInterval(fetchLive, 60000);
    return () => clearInterval(id);
  }, []);

  // Global mouseup safety net for zoom drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (chartRef.current) {
        chartRef.current.options.plugins!.zoom!.pan!.enabled = true;
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // --- Derived ---
  const coinData = prices?.coins[currentCoin];
  const colors = coinColors[currentCoin] || coinColors.ETH;

  // Unique tags with user-defined colors (from pins data)
  const uniqueTags = useMemo(() => {
    if (!pinsData) return [];
    const seen = new Map<string, string>();
    for (const p of pinsData.pins) {
      if (!seen.has(p.tag)) seen.set(p.tag, p.tagColor);
    }
    return [...seen.entries()].map(([tag, color]) => ({ tag, color }));
  }, [pinsData]);

  // Time range switching
  const setRange = useCallback((range: string) => {
    setActiveRange(range);
    userZoomed.current = false;
    zoomedRangeRef.current = null;
    const chart = chartRef.current;
    if (!chart) return;
    if (!coinData) return;
    const priceList = coinData.prices;
    if (priceList.length === 0) return;
    const last = priceList[priceList.length - 1].date;

    let minDate: string;
    let maxDate = last + 'T23:59:59Z';

    if (range === 'ALL') {
      minDate = priceList[0].date + 'T00:00:00Z';
    } else if (range === 'YTD') {
      const d = new Date(last + 'T00:00:00Z');
      minDate = `${d.getUTCFullYear()}-01-01T00:00:00Z`;
    } else {
      const days = range === '1W' ? 7 : range === '1M' ? 30 : 365;
      const endTs = new Date(last + 'T00:00:00Z').getTime();
      const startTs = endTs - days * 86400000;
      minDate = new Date(startTs).toISOString();
    }

    chart.resetZoom('none');
    zoomedRangeRef.current = { min: minDate, max: maxDate };
    chart.zoomScale('x', { min: minDate as any, max: maxDate as any }, 'default');
  }, [coinData]);

  // Chart data assembly
  const chartData = useMemo(() => {
    if (!coinData) return null;
    const allPrices = coinData.prices;

    const pricePoints = allPrices.map((p) => ({ x: p.date, y: p.price }));

    // Pin markers — only where pin date matches a price date
    const pinPoints: Array<{
      x: string;
      y: number | null;
      pin: ChartPin | null;
      tagColor: string | null;
    }> = [];

    if (pinsData) {
      const pinsByDate = new Map<string, ChartPin[]>();
      for (const pin of pinsData.pins) {
        const list = pinsByDate.get(pin.date) || [];
        list.push(pin);
        pinsByDate.set(pin.date, list);
      }

      for (const p of allPrices) {
        const pinsForDate = pinsByDate.get(p.date);
        if (pinsForDate) {
          const activePin = [...pinsForDate].reverse().find((pin) => !hiddenTags.has(pin.tag));
          if (activePin) {
            pinPoints.push({
              x: p.date,
              y: p.price,
              pin: activePin,
              tagColor: activePin.tagColor,
            });
          } else {
            pinPoints.push({ x: p.date, y: null, pin: null, tagColor: null });
          }
        } else {
          pinPoints.push({ x: p.date, y: null, pin: null, tagColor: null });
        }
      }
    }

    return {
      datasets: [
        {
          label: `${currentCoin} Price`,
          data: pricePoints,
          borderColor: colors.line,
          backgroundColor: colors.fill,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 5,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Pinned Events',
          data: pinPoints,
          pointBackgroundColor: (ctx: any) => ctx.raw?.tagColor || 'transparent',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: (ctx: any) => (ctx.raw?.pin ? 10 : 0),
          pointHoverRadius: (ctx: any) => (ctx.raw?.pin ? 14 : 0),
          pointStyle: 'triangle',
          showLine: false,
        },
      ],
    };
  }, [coinData, currentCoin, colors, pinsData, hiddenTags]);

  // Stats
  const stats = useMemo(() => {
    if (!coinData || coinData.prices.length === 0) return null;
    const live = livePrices[currentCoin];
    const current = live?.current ?? coinData.prices[coinData.prices.length - 1].price;
    const high = live?.high24h ?? Math.max(...coinData.prices.map((p) => p.price));
    const low = live?.low24h ?? Math.min(...coinData.prices.map((p) => p.price));
    return { current, high, low };
  }, [coinData, currentCoin, livePrices]);

  // Flat pin list for table (data-driven, no event lookup needed)
  const pinList = useMemo(() => {
    if (!pinsData) return [];
    return pinsData.pins;
  }, [pinsData]);

  // Data bounds for zoom clamping
  const dataBounds = useMemo(() => {
    if (!coinData || coinData.prices.length === 0) return null;
    return {
      first: new Date(coinData.prices[0].date + 'T00:00:00Z').getTime(),
      last: new Date(coinData.prices[coinData.prices.length - 1].date + 'T00:00:00Z').getTime(),
    };
  }, [coinData]);

  // --- Render ---
  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f0f1a', color: '#a0a0b8',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#1a1a2e', minHeight: '100vh', color: '#fff' }}>
      {/* Back link */}
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        color: '#ff2e63', textDecoration: 'none', fontWeight: 500, marginBottom: 24,
      }}>
        <IconChevronLeft size={16} />
        Back to Calendar
      </Link>

      {/* Header + coin switcher */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #2a2a45',
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Price Impact Analysis</h1>
          <p style={{ fontSize: 14, color: '#6b6b85', marginTop: 4 }}>
            Track how DeFi hack events affected crypto prices
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['ETH', 'BTC', 'SOL'].map((coin) => (
            <button
              key={coin}
              onClick={() => setCurrentCoin(coin)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '8px 16px',
                background: currentCoin === coin ? '#ff2e63' : '#252540',
                border: '1px solid #2a2a45',
                borderRadius: 8,
                color: currentCoin === coin ? '#fff' : '#a0a0b8',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Current Price" value={`$${stats.current.toLocaleString()}`} live={!!livePrices[currentCoin]} />
          <StatCard label="24h High" value={`$${stats.high.toLocaleString()}`} live={!!livePrices[currentCoin]} />
          <StatCard label="24h Low" value={`$${stats.low.toLocaleString()}`} live={!!livePrices[currentCoin]} />
          <StatCard label="Pinned Events" value={String(pinList.length)} />
        </div>
      )}

      {/* Time range + hint */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['1W', '1M', '1Y', 'YTD', 'ALL'].map((range) => (
            <button
              key={range}
              onClick={() => setRange(range)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '6px 14px',
                background: activeRange === range ? '#ff2e63' : '#252540',
                border: '1px solid #2a2a45',
                borderRadius: 6,
                color: activeRange === range ? '#fff' : '#a0a0b8',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {range}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#6b6b85' }}>
          Drag on chart to zoom, scroll to pan
        </span>
      </div>

      {/* Chart */}
      <div style={{
        background: '#0f0f1a', border: '1px solid #2a2a45',
        borderRadius: 12, padding: 24, height: 500, position: 'relative',
      }}>
        {chartData && (
          <Line
            ref={chartRef}
            data={chartData as any}
            options={{
              animation: false,
              responsive: true,
              maintainAspectRatio: false,
              interaction: { intersect: false, mode: 'index' },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1a1a25',
                  titleColor: '#f8f8fc',
                  bodyColor: '#a0a0b8',
                  borderColor: '#2a2a3a',
                  borderWidth: 1,
                  padding: 12,
                  callbacks: {
                    title: (items: any[]) => {
                      if (!items || items.length === 0) return '';
                      const raw = items[0].raw;
                      const dateStr = raw && raw.x ? raw.x : items[0].label;
                      return new Date(dateStr).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      });
                    },
                    label: (context: any) => {
                      const dsLabel = context.dataset.label || '';
                      if (dsLabel.includes('Price')) {
                        return ` ${dsLabel}: $${Number(context.parsed.y).toLocaleString()}`;
                      }
                      const raw = context.dataset.data[context.dataIndex];
                      if (raw?.pin) {
                        return ` ${raw.pin.tag}: ${raw.pin.protocol} (${raw.pin.estimatedLoss})`;
                      }
                      return '';
                    },
                  },
                },
                zoom: {
                  pan: { enabled: true, mode: 'x' },
                  zoom: {
                    drag: { enabled: true, backgroundColor: 'rgba(255,46,99,0.2)' },
                    mode: 'x',
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    onZoomStart: ({ chart }: any) => {
                      chart.options.plugins.zoom.pan.enabled = false;
                    },
                    onZoomComplete: ({ chart }: any) => {
                      chart.options.plugins.zoom.pan.enabled = true;
                      userZoomed.current = true;
                      zoomedRangeRef.current = {
                        min: chart.scales.x.min,
                        max: chart.scales.x.max,
                      };
                    },
                  } as any,
                  limits: dataBounds ? {
                    x: { min: dataBounds.first, max: dataBounds.last },
                  } : undefined,
                },
              },
                scales: {
                  x: {
                    type: 'time',
                    grid: { color: '#2a2a3a' },
                    ticks: { color: '#6b6b85' },
                    min: zoomedRangeRef.current?.min,
                    max: zoomedRangeRef.current?.max,
                  },
                y: {
                  grid: { color: '#2a2a3a' },
                  ticks: {
                    color: '#6b6b85',
                    callback: (val: any) => `$${Number(val).toLocaleString()}`,
                  },
                },
              },
            }}
          />
        )}
      </div>

      {/* Legend: auto-generated from unique tags */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 32,
        marginTop: 24, padding: 16, background: '#252540',
        borderRadius: 8, flexWrap: 'wrap',
      }}>
        <LegendItem color={colors.line} label="Price Line" line />
        {uniqueTags.map(({ tag, color }) => (
          <LegendItem
            key={tag}
            color={color}
            label={tag}
            dimmed={hiddenTags.has(tag)}
            onClick={() => toggleTag(tag)}
          />
        ))}
      </div>

      {/* Pin event table — fully self-contained, no event lookup */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Major DeFi Events</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a45', textAlign: 'left', color: '#6b6b85' }}>
                <th style={{ padding: '12px 16px', width: 120, whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ padding: '12px 16px', width: 140, whiteSpace: 'nowrap' }}>Tag</th>
                <th style={{ padding: '12px 16px', width: 150, whiteSpace: 'nowrap' }}>Protocol</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', width: 100, whiteSpace: 'nowrap' }}>Est. Loss</th>
              </tr>
            </thead>
            <tbody>
              {pinList.map((pin) => (
                <tr
                  key={pin.date + pin.protocol}
                  onClick={() => {
                    if (pin.link) {
                      if (pin.link.startsWith('http')) {
                        window.open(pin.link, '_blank', 'noopener,noreferrer');
                      } else {
                        router.push(pin.link);
                      }
                    }
                  }}
                  style={{
                    borderBottom: '1px solid #2a2a45',
                    cursor: pin.link ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (pin.link) e.currentTarget.style.background = '#252540';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{pin.date}</td>
                  <td style={{ padding: '12px 16px', color: pin.tagColor, whiteSpace: 'nowrap' }}>{pin.tag}</td>
                  <td style={{ padding: '12px 16px', color: '#a0a0b8', whiteSpace: 'nowrap' }}>{pin.protocol}</td>
                  <td style={{
                    padding: '12px 16px', color: '#fff', fontWeight: 500,
                    whiteSpace: 'normal', wordBreak: 'break-word',
                  }}>
                    {pin.description || 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#a0a0b8', whiteSpace: 'nowrap' }}>
                    {pin.estimatedLoss}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div style={{
      background: '#252540', border: '1px solid #2a2a45',
      borderRadius: 8, padding: 16,
    }}>
      <div style={{
        fontSize: 11, color: '#6b6b85',
        textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {label}
        {live && (
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: '#22c55e',
          }} />
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

function LegendItem({
  color, label, line, dimmed, onClick,
}: {
  color: string;
  label: string;
  line?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {line ? (
        <div style={{ width: 24, height: 3, borderRadius: 2, background: color }} />
      ) : (
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
      )}
      <span style={{ textDecoration: dimmed ? 'line-through' : 'none' }}>{label}</span>
    </div>
  );
}
