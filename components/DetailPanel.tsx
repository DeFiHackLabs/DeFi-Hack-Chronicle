"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import type { HackEvent, Category, Blockchain, AccountType, RoleInfo, Transaction, Attacker, Victim } from '@/lib/types';
import { formatCurrency, getLocalizedArray, getLocalizedField, getEventCategories, getEventCategoryColor } from '@/lib/utils';
import { IconInfo } from './Icons';

// ---------------------------------------------------------------------------
// Blockchain explorer URL configuration
// ---------------------------------------------------------------------------
// Maps a canonical chain name to its transaction and address explorer URLs.
// `canonicalChain()` normalises input before lookup so aliases (e.g. "bnb",
// "bnb chain", "binance") all resolve to the same explorer.
// ---------------------------------------------------------------------------

const EXPLORERS: Record<string, { tx: string; address: string }> = {
  ethereum:    { tx: 'https://etherscan.io/tx/',         address: 'https://etherscan.io/address/' },
  bsc:         { tx: 'https://bscscan.com/tx/',          address: 'https://bscscan.com/address/' },
  'bnb chain': { tx: 'https://bscscan.com/tx/',          address: 'https://bscscan.com/address/' },
  binance:     { tx: 'https://bscscan.com/tx/',          address: 'https://bscscan.com/address/' },
  polygon:     { tx: 'https://polygonscan.com/tx/',      address: 'https://polygonscan.com/address/' },
  arbitrum:    { tx: 'https://arbiscan.io/tx/',          address: 'https://arbiscan.io/address/' },
  avalanche:   { tx: 'https://snowtrace.io/tx/',         address: 'https://snowtrace.io/address/' },
  solana:      { tx: 'https://solscan.io/tx/',           address: 'https://solscan.io/account/' },
  bitcoin:     { tx: 'https://mempool.space/tx/',        address: 'https://mempool.space/address/' },
  optimism:    { tx: 'https://optimistic.etherscan.io/tx/', address: 'https://optimistic.etherscan.io/address/' },
  base:        { tx: 'https://basescan.org/tx/',            address: 'https://basescan.org/address/' },
  tron:        { tx: 'https://tronscan.org/#/transaction/', address: 'https://tronscan.org/#/address/' },
};

/**
 * Normalise a raw chain string into a canonical key used by the `EXPLORERS` map.
 * Handles slashed prefixes (e.g. "bsc/..." → "bsc") and known aliases like "bnb".
 * Falls back to "ethereum" when the input is empty or unrecognised.
 */
function canonicalChain(chain: string): string {
  if (!chain) return 'ethereum';
  const c = chain.split('/')[0].trim().toLowerCase();
  if (c === 'bnb') return 'bsc'; // "bnb" → BSC explorer
  return c;
}

/**
 * Build an explorer URL for a given chain, transaction hash, or address.
 * Falls back to Etherscan when the chain is not in the EXPLORERS map.
 */
function getExplorerUrl(chain: string, type: 'tx' | 'address', hash: string): string {
  const key = canonicalChain(chain);
  const explorer = EXPLORERS[key];
  if (explorer) return explorer[type] + hash;
  return `https://etherscan.io/${type}/${hash}`; // Safe fallback
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

// Merge all role arrays into one for quick color lookup
function findRoleColor(
  roleId: string,
  attackerRoles: RoleInfo[],
  victimRoles: RoleInfo[],
  transactionRoles: RoleInfo[]
): string | undefined {
  return [...attackerRoles, ...victimRoles, ...transactionRoles].find((r) => r.id === roleId)?.color;
}

interface DetailPanelProps {
  selectedEvent: HackEvent | null;
  panelViewMode: 'empty' | 'list' | 'detail';
  panelListEvents: HackEvent[];
  panelListDate: Date | null;
  categories: Category[];
  blockchains: Blockchain[];
  accountTypes: AccountType[];
  attackerRoles: RoleInfo[];
  victimRoles: RoleInfo[];
  transactionRoles: RoleInfo[];
  currentLang: string;
  t: (key: string) => string;
  onEventSelect: (event: HackEvent) => void;
  onBackToList: () => void;
}

// ---------------------------------------------------------------------------
// Main panel component — resizable / collapsible sidebar
// ---------------------------------------------------------------------------
//
// The panel lives as a third grid column in `.app-container`.  It can be:
//   • Resized by dragging the left handle (320px – 800px range).
//   • Collapsed to a narrow 36px strip via the toggle button.
//
// Resize is implemented with refs (not React state) to avoid causing a
// re-render on every pixel of mouse movement.  Only the final width is
// committed to state (and applied to the grid) on mouseup.
// ---------------------------------------------------------------------------

export default function DetailPanel({
  selectedEvent, panelViewMode, panelListEvents, panelListDate,
  categories, blockchains, accountTypes,
  attackerRoles, victimRoles, transactionRoles,
  currentLang, t,
  onEventSelect, onBackToList
}: DetailPanelProps) {
  const detailContentRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  // Mirrors isResizing ref so CSS `dragging` class applies reactively
  const [isDragging, setIsDragging] = useState(false);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(380);
  const appContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    appContainerRef.current = document.querySelector('.app-container');
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (collapsed) return;
    isResizing.current = true;
    setIsDragging(true);
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [collapsed, panelWidth]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizing.current || !appContainerRef.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = startWidth.current + delta;
      const clamped = Math.max(320, Math.min(newWidth, 800));
      setPanelWidth(clamped);
      appContainerRef.current.style.gridTemplateColumns =
        `300px minmax(400px, 1fr) ${clamped}px`;
    };

    const handleUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (appContainerRef.current) {
        if (next) {
          // Collapse: narrow strip for the toggle button only
          appContainerRef.current.style.gridTemplateColumns = `300px 1fr 36px`;
        } else {
          // Expand: restore reasonable width bounded by viewport
          const desired = selectedEvent ? 600 : 320;
          const maxW = window.innerWidth - 300 /* sidebar */ - 400 /* chart min */;
          const w = Math.min(desired, maxW);
          appContainerRef.current.style.gridTemplateColumns =
            `300px minmax(400px, 1fr) ${w}px`;
          setPanelWidth(w);
        }
      }
      return next;
    });
  }, [selectedEvent]);

  return (
    <aside
      className={`detail-panel ${collapsed ? 'collapsed' : ''}`}
      id="detailPanel"
    >
      <div
        className={`resize-handle ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <button
          className="panel-toggle-btn"
          onClick={toggleCollapse}
          title={collapsed ? t('panel.expand') : t('panel.collapse')}
        >
          <span className="toggle-icon" />
        </button>
      </div>

      <div className="detail-panel-content" ref={detailContentRef}>
        <AnimatePresence mode="wait">

          {panelViewMode === 'empty' && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="detail-empty"
            >
              <div className="empty-icon">😮‍💨</div>
              <p>{t('detail.emptyTitle')}</p>
            </motion.div>
          )}

          {panelViewMode === 'list' && panelListDate && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="event-list-panel"
            >
              <div className="event-list-header">
                {t('detail.multipleEventsHeader')}
              </div>
              <div className="event-list-container">
                {panelListEvents.map((event, index) => {
                  const borderColor = getEventCategoryColor(event, categories);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="event-list-item"
                      style={{ borderLeftColor: borderColor, cursor: 'pointer' }}
                      onClick={() => onEventSelect(event)}
                    >
                      <div className="event-list-title">
                        {getLocalizedField(event, 'title', currentLang) || event.title}
                      </div>
                      <div className="event-list-meta">
                        <span>{event.protocol}</span>
                        <span> · </span>
                        {getEventCategories(event).map((cid) => {
                          const cat = categories.find((c) => c.id === cid);
                          return (
                            <span key={cid} style={{ color: cat?.color || '#888' }}>
                              {cat?.name || cid}
                            </span>
                          );
                        })}
                        <span className="loss" style={{ marginLeft: 'auto' }}>
                          {formatCurrency(event.estimatedLoss?.totalUSD)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {panelViewMode === 'detail' && selectedEvent && (
            <motion.div
              key={selectedEvent.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <EventDetail
                event={selectedEvent}
                categories={categories}
                blockchains={blockchains}
                accountTypes={accountTypes}
                attackerRoles={attackerRoles}
                victimRoles={victimRoles}
                transactionRoles={transactionRoles}
                currentLang={currentLang}
                t={t}
                showBack={panelListEvents.length > 1}
                onBack={onBackToList}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

// ===================================================================
// EventDetail — Full-detail view for a single hack event
// ===================================================================

interface EventDetailProps {
  event: HackEvent;
  categories: Category[];
  blockchains: Blockchain[];
  accountTypes: AccountType[];
  attackerRoles: RoleInfo[];
  victimRoles: RoleInfo[];
  transactionRoles: RoleInfo[];
  currentLang: string;
  t: (key: string) => string;
  showBack: boolean;
  onBack: () => void;
}

function EventDetail({
  event, categories, blockchains, accountTypes,
  attackerRoles, victimRoles, transactionRoles,
  currentLang, t,
  showBack, onBack
}: EventDetailProps) {
  // --- Derived values from the event (with i18n fallback) ---
  const catIds         = getEventCategories(event);
  const chainNames     = event.blockchain.map((id) => {
    const bc = blockchains.find((b) => b.id === id);
    return bc ? bc.name : id;
  });
  const title          = getLocalizedField(event, 'title', currentLang) || event.title;
  const description    = getLocalizedField(event, 'description', currentLang) || event.description;
  const rootCause      = getLocalizedField(event, 'rootCause', currentLang) || event.rootCause;
  const attackVector   = getLocalizedField(event, 'attackVector', currentLang) || event.attackVector;
  const lessons        = getLocalizedArray<string>(event, 'lessons', currentLang);
  const references     = event.references || [];
  const transactions   = getLocalizedArray<Transaction>(event, 'transactions', currentLang);
  const attackers      = getLocalizedArray<Attacker>(event, 'attackers', currentLang);
  const victims        = getLocalizedArray<Victim>(event, 'victims', currentLang);

  // --- Animation: each section staggers slightly for a cascading feel ---
  const sectionAnim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className="detail-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, staggerChildren: 0.06 }}
    >
      {/* Back button — only shown when the date had multiple events */}
      {showBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="back-to-list-btn"
          onClick={onBack}
        >
          <span className="back-arrow">←</span>
          <span>{t('detail.backToList')}</span>
        </motion.button>
      )}

      <motion.div className="detail-header" {...sectionAnim} transition={{ delay: 0.05 }}>
        <div className="detail-category">
          {catIds.map((cid) => {
            const cat = categories.find((c) => c.id === cid);
            const color = cat?.color || '#888';
            return (
              <span
                key={cid}
                className="detail-category-badge"
                style={{ background: `${color}20`, color }}
              >
                {cat?.name || cid}
              </span>
            );
          })}
        </div>
        <span className="detail-date">{event.date}</span>
      </motion.div>

      <motion.h2 className="detail-title" {...sectionAnim} transition={{ delay: 0.1 }}>
        {title}
      </motion.h2>

      <motion.div className="detail-meta" {...sectionAnim} transition={{ delay: 0.15 }}>
        <MetaItem label={t('detail.protocol')} value={event.protocol} />
        <MetaItem label={t('detail.blockchain')} value={chainNames.join(', ')} />
        <div className="meta-item">
          <span className="meta-label loss-label-wrap">
            {t('detail.loss')}
            <span className="loss-label-icon">
              <IconInfo />
              <span className="loss-tooltip">{t('detail.lossTooltip')}</span>
            </span>
          </span>
          <span className="meta-value loss">
            {formatCurrency(event.estimatedLoss?.totalUSD)}
          </span>
        </div>
      </motion.div>

      <DetailSection title={t('detail.description')} delay={0.2} {...sectionAnim}>
        <p>{description}</p>
      </DetailSection>

      {rootCause && (
        <DetailSection title={t('detail.rootCause')} delay={0.25} {...sectionAnim}>
          <p>{rootCause}</p>
        </DetailSection>
      )}

      {attackVector && (
        <DetailSection title={t('detail.attackVector')} delay={0.25} {...sectionAnim}>
          <p>{attackVector}</p>
        </DetailSection>
      )}

      {lessons.length > 0 && (
        <DetailSection title={t('detail.lessons')} delay={0.3} {...sectionAnim}>
          <ul>{lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </DetailSection>
      )}

      {references.length > 0 && (
        <DetailSection title={t('detail.references')} delay={0.3} {...sectionAnim}>
          <ul>
            {references.map((r, i) => (
              <li key={i}>
                <a href={r} target="_blank" rel="noopener noreferrer">{r}</a>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {transactions.length > 0 && (
        <DetailSection title={t('detail.transactions')} delay={0.35} {...sectionAnim}>
          {transactions.map((tx, i) => {
            const txRoleColor = findRoleColor(tx.role, attackerRoles, victimRoles, transactionRoles);
            return (
              <div className="detail-item" key={tx.txHash || i}>
                <div className="detail-item-header">
                  <code className="tx-hash">{tx.txHash}</code>
                  <span className="item-role" style={txRoleColor ? { background: `${txRoleColor}22`, color: txRoleColor } : {}}>{tx.role}</span>
                </div>
                <p className="item-description">{tx.description}</p>
                <a
                  href={getExplorerUrl(tx.blockchain || '', 'tx', tx.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  View on Explorer →
                </a>
              </div>
            );
          })}
        </DetailSection>
      )}

      {attackers.length > 0 && (
        <DetailSection title={t('detail.attackers')} delay={0.35} {...sectionAnim}>
          {attackers.map((att) => (
            <AccountItem
              key={att.address}
              address={att.address}
              role={att.role}
              blockchain={att.blockchain || ''}
              description={att.description || ''}
              accountType={att.accountType || ''}
              accountTypes={accountTypes}
              attackerRoles={attackerRoles}
              victimRoles={victimRoles}
              transactionRoles={transactionRoles}
            />
          ))}
        </DetailSection>
      )}

      {victims.length > 0 && (
        <DetailSection title={t('detail.victims')} delay={0.4} {...sectionAnim}>
          {victims.map((vic) => (
            <AccountItem
              key={vic.address}
              address={vic.address}
              role={vic.role}
              blockchain={vic.blockchain || ''}
              description={vic.description || ''}
              accountType={vic.accountType || ''}
              accountTypes={accountTypes}
              attackerRoles={attackerRoles}
              victimRoles={victimRoles}
              transactionRoles={transactionRoles}
              // Victims may not always have an address on-chain
              hideExplorerLink={!vic.address}
            />
          ))}
        </DetailSection>
      )}
    </motion.div>
  );
}

// ===================================================================
// Sub-components used inside EventDetail
// ===================================================================

/** A single key-value row in the metadata section. */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  );
}

/** A titled content block with staggered fade-in animation. */
function DetailSection({
  title,
  delay,
  initial,
  animate,
  children,
}: {
  title: string;
  delay: number;
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="detail-section"
      initial={initial}
      animate={animate}
      transition={{ delay }}
    >
      <h3>{title}</h3>
      {children}
    </motion.div>
  );
}

/**
 * Render a single on-chain account entry (used for both attackers and victims).
 * Shows address, role badge, optional account-type badge, description, and an
 * explorer link.
 */
function AccountItem({
  address,
  role,
  blockchain,
  description,
  accountType,
  accountTypes,
  attackerRoles,
  victimRoles,
  transactionRoles,
  hideExplorerLink = false,
}: {
  address: string;
  role: string;
  blockchain: string;
  description: string;
  accountType: string;
  accountTypes: AccountType[];
  attackerRoles: RoleInfo[];
  victimRoles: RoleInfo[];
  transactionRoles: RoleInfo[];
  hideExplorerLink?: boolean;
}) {
  const typeInfo = accountTypes.find((t) => t.id === accountType);
  const roleColor = findRoleColor(role, attackerRoles, victimRoles, transactionRoles);

  return (
    <div className="detail-item">
      <div className="detail-item-header">
        <code className="address">{address}</code>
        <span className="detail-item-tags">
          <span className="item-role" style={roleColor ? { background: `${roleColor}22`, color: roleColor } : {}}>{role}</span>
          {typeInfo && (
            <span
              className="account-type-badge"
              style={{
                background: `${typeInfo.color}22`,
                color: typeInfo.color,
                border: `1px solid ${typeInfo.color}44`,
              }}
            >
              {typeInfo.name}
            </span>
          )}
        </span>
      </div>

      <p className="item-description">{description}</p>

      {!hideExplorerLink && (
        <a
          href={getExplorerUrl(blockchain, 'address', address)}
          target="_blank"
          rel="noopener noreferrer"
          className="address-link"
        >
          View on Explorer →
        </a>
      )}
    </div>
  );
}
