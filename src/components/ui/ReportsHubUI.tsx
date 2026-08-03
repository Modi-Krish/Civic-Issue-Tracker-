'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Map as MapIcon, Plus } from 'lucide-react';
import MyReportsTab from './MyReportsTab';
import NearbyReportsTab from './NearbyReportsTab';
import SmartReportModal from './SmartReportModal';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  base:       '#EDEBE4',
  raised:     '#F5F3EC',
  border:     '#DDD9CE',
  text1:      '#2C2C2A',
  text2:      '#5F5E5A',
  text3:      '#888780',
  accent:     '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
} as const;

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, -3px -3px 7px ${T.shL}`, // Modified inset soft
  inset:     `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
};

interface ReportsHubUIProps {
  user: any;
  profile: any;
}

export default function ReportsHubUI({ user, profile }: ReportsHubUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initTab = searchParams.get('tab') === 'nearby' ? 'nearby' : 'my-reports';
  const [activeTab, setActiveTab] = useState<'my-reports' | 'nearby'>(initTab as any);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReportIssue = () => {
    setIsModalOpen(true);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.base,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color: T.text1,
      paddingBottom: 100,
    }}>
      <style>{`
        .rh-container {
          width: 100%;
          max-width: 100%;
          padding: 0 16px;
        }
        @media (min-width: 1024px) {
          .rh-container {
            max-width: 1300px;
            margin: 0 auto;
            padding: 0 32px;
          }
        }
        .rh-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 0;
          font-size: 14px;
          font-weight: 700;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .rh-tab-active {
          background: linear-gradient(145deg, ${T.accent}, ${T.accentDark});
          color: white;
          box-shadow: ${SH.raisedSm};
        }
        .rh-tab-inactive {
          background: transparent;
          color: ${T.text3};
        }
        .rh-fab {
          position: fixed;
          bottom: max(90px, calc(env(safe-area-inset-bottom, 0px) + 70px));
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(145deg, ${T.accent}, ${T.accentDark});
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(29, 158, 117, 0.4), inset 0 2px 4px rgba(255,255,255,0.2);
          z-index: 100;
          transition: transform 0.15s;
        }
        .rh-fab:active {
          transform: scale(0.92);
        }
        @media (min-width: 1024px) {
          .rh-fab {
            bottom: 40px;
            right: 40px;
            width: 64px;
            height: 64px;
          }
        }
      `}</style>

      <div className="rh-container">
        
        {/* Header & Tabs */}
        <div style={{ padding: '24px 0 20px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 16px', color: T.text1 }}>
            Citizen Reports Hub
          </h1>
          
          <div style={{
            display: 'flex', gap: 6, borderRadius: 18,
            background: T.raised, padding: '4px',
            boxShadow: SH.insetSoft
          }}>
            <button
              className={`rh-tab-btn ${activeTab === 'my-reports' ? 'rh-tab-active' : 'rh-tab-inactive'}`}
              onClick={() => setActiveTab('my-reports')}
            >
              <FileText size={18} /> My Reports
            </button>
            <button
              className={`rh-tab-btn ${activeTab === 'nearby' ? 'rh-tab-active' : 'rh-tab-inactive'}`}
              onClick={() => setActiveTab('nearby')}
            >
              <MapIcon size={18} /> Nearby Reports
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-reports' ? (
          <MyReportsTab user={user} profile={profile} />
        ) : (
          <NearbyReportsTab user={user} profile={profile} />
        )}

      </div>

      {/* Persistent FAB */}
      <button className="rh-fab" onClick={handleReportIssue} aria-label="Report Issue">
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Smart Report Modal */}
      <SmartReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user} 
      />
    </div>
  );
}
