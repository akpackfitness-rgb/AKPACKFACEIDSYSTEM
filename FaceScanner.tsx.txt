import { useEffect, useRef, useState, useCallback } from 'react';
import { loadModels, detectFaceDescriptor, findBestMatch } from '../services/faceService';
import { getAllMembers } from '../services/sheetsService';
import type { Member } from '../services/sheetsService';
import { CONTROL_SYSTEM_URL } from '../config';

type ScanState = 'loading' | 'scanning' | 'success' | 'failed' | 'redirecting';

export default function FaceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);
  const membersRef = useRef<Member[]>([]);

  const [scanState, setScanState] = useState<ScanState>('loading');
  const [statusMsg, setStatusMsg] = useState('Loading face recognition models...');
  const [matchedMember, setMatchedMember] = useState<Member | null>(null);
  const [scanOverlay, setScanOverlay] = useState(false);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopScanning();
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [stopScanning]);

  const handleSuccess = useCallback((member: Member) => {
    stopScanning();
    setMatchedMember(member);
    setScanState('success');
    setScanOverlay(false);
  }, [stopScanning]);

  const handleFailure = useCallback(() => {
    failCountRef.current += 1;
    if (failCountRef.current >= 2) {
      stopScanning();
      setScanState('failed');
      setStatusMsg('Face not recognized. Switching to manual entry.');
      setTimeout(() => {
        setScanState('redirecting');
        window.location.href = CONTROL_SYSTEM_URL;
      }, 2000);
    }
  }, [stopScanning]);

  const startScanning = useCallback(() => {
    if (!videoRef.current) return;
    setScanState('scanning');
    setStatusMsg('Scanning... Position your face in the frame.');
    setScanOverlay(true);
    failCountRef.current = 0;

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const descriptor = await detectFaceDescriptor(videoRef.current);
        if (!descriptor) return;
        const match = findBestMatch(descriptor, membersRef.current);
        if (match) {
          handleSuccess(match.member);
        } else {
          handleFailure();
        }
      } catch {
        // silently retry
      }
    }, 1500);
  }, [handleSuccess, handleFailure]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setStatusMsg('Loading face recognition models...');
        await loadModels();
        if (!mounted) return;

        setStatusMsg('Loading member data...');
        const members = await getAllMembers();
        membersRef.current = members.filter((m) => m.faceEncoding);
        if (!mounted) return;

        setStatusMsg('Starting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play();
            startScanning();
          };
        }
      } catch (err) {
        if (!mounted) return;
        setScanState('failed');
        setStatusMsg('Camera access denied or error occurred. Please check permissions.');
      }
    }

    init();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [startScanning, stopCamera]);

  const handleRescan = () => {
    setMatchedMember(null);
    failCountRef.current = 0;
    setScanState('loading');
    startScanning();
  };

  return (
    <div className="face-scanner-page">
      <div className="scanner-container">
        {/* Camera feed */}
        <div className="camera-wrapper">
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="camera-canvas" />

          {/* Scan overlay frame */}
          {scanOverlay && scanState === 'scanning' && (
            <div className="scan-overlay">
              <div className="scan-frame">
                <span className="corner tl" />
                <span className="corner tr" />
                <span className="corner bl" />
                <span className="corner br" />
                <div className="scan-line" />
              </div>
            </div>
          )}

          {/* Status badge on camera */}
          <div className={`camera-status-badge ${scanState}`}>
            {scanState === 'loading' && (
              <span className="status-dot loading" />
            )}
            {scanState === 'scanning' && (
              <span className="status-dot scanning" />
            )}
            {scanState === 'success' && (
              <span className="status-dot success" />
            )}
            {scanState === 'failed' || scanState === 'redirecting' ? (
              <span className="status-dot failed" />
            ) : null}
            <span className="status-text-badge">
              {scanState === 'loading' && 'Initializing'}
              {scanState === 'scanning' && 'Scanning'}
              {scanState === 'success' && 'Verified'}
              {(scanState === 'failed' || scanState === 'redirecting') && 'Not Recognized'}
            </span>
          </div>
        </div>

        {/* Info panel */}
        <div className="info-panel">
          {/* Loading / Scanning state */}
          {(scanState === 'loading' || scanState === 'scanning') && (
            <div className="state-card">
              <div className="pulse-ring">
                <div className="pulse-core" />
              </div>
              <p className="state-message">{statusMsg}</p>
            </div>
          )}

          {/* Success state */}
          {scanState === 'success' && matchedMember && (
            <div className="member-card">
              <div className="member-card-header">
                <div className="verified-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Face Verified — Welcome to the Pack
                </div>
              </div>
              <div className="member-details">
                <MemberRow label="Membership ID" value={matchedMember.membershipId} highlight />
                <MemberRow label="Client Name" value={matchedMember.clientName} />
                <MemberRow label="Package" value={matchedMember.packageDetails} />
                <MemberRow label="Validity" value={matchedMember.packageValidity} />
                <MemberRow label="Start Date" value={matchedMember.startingDate} />
                <MemberRow label="Renewal Date" value={matchedMember.renewalDate} />
              </div>
              <button className="btn-rescan" onClick={handleRescan}>
                Scan Next Member
              </button>
            </div>
          )}

          {/* Failed / Redirecting state */}
          {(scanState === 'failed' || scanState === 'redirecting') && (
            <div className="state-card failed">
              <div className="failed-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="state-message failed">{statusMsg}</p>
              {scanState === 'redirecting' && (
                <div className="redirect-dots">
                  <span /><span /><span />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="member-row">
      <span className="member-label">{label}</span>
      <span className={`member-value ${highlight ? 'highlight' : ''}`}>{value || '—'}</span>
    </div>
  );
}
