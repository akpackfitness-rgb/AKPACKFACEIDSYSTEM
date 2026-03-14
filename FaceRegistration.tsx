import { useEffect, useRef, useState } from 'react';
import { loadModels, detectFaceDescriptorFromCanvas, descriptorToString, compressImageToBase64 } from '../services/faceService';
import { getMemberById, updateFaceData } from '../services/sheetsService';
import type { Member } from '../services/sheetsService';

type RegState = 'idle' | 'loading-member' | 'member-found' | 'camera-ready' | 'captured' | 'saving' | 'saved' | 'error';

export default function FaceRegistration() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [membershipId, setMembershipId] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [regState, setRegState] = useState<RegState>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [capturedEncoding, setCapturedEncoding] = useState<string>('');
  const [modelsReady, setModelsReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadModels().then(() => setModelsReady(true)).catch(() => {
      setStatusMsg('Failed to load face recognition models.');
    });
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function handleMemberLookup() {
    if (!membershipId.trim()) return;
    setRegState('loading-member');
    setStatusMsg('Looking up member...');
    try {
      const found = await getMemberById(membershipId.trim());
      if (found) {
        setMember(found);
        setRegState('member-found');
        setStatusMsg('');
      } else {
        setRegState('error');
        setStatusMsg(`Member ID "${membershipId}" not found in the system.`);
      }
    } catch {
      setRegState('error');
      setStatusMsg('Failed to fetch member data. Check your connection.');
    }
  }

  async function handleStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRegState('camera-ready');
      setStatusMsg('Position your face clearly in the frame, then click Capture.');
    } catch {
      setRegState('error');
      setStatusMsg('Camera access denied. Please allow camera permissions.');
    }
  }

  async function handleCapture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setStatusMsg('Detecting face...');
    try {
      const descriptor = await detectFaceDescriptorFromCanvas(canvas);
      if (!descriptor) {
        setStatusMsg('No face detected. Please reposition and try again.');
        return;
      }
      const imageData = compressImageToBase64(canvas);
      const encodingStr = descriptorToString(descriptor);
      setCapturedImage(imageData);
      setCapturedEncoding(encodingStr);
      stopCamera();
      setRegState('captured');
      setStatusMsg('Face captured successfully!');
    } catch {
      setStatusMsg('Error detecting face. Please try again.');
    }
  }

  function handleRetake() {
    setCapturedImage('');
    setCapturedEncoding('');
    setRegState('member-found');
    setStatusMsg('');
  }

  async function handleSave() {
    if (!member || !capturedEncoding) return;
    setRegState('saving');
    setStatusMsg('Saving face data to Google Sheets...');
    try {
      await updateFaceData(member.membershipId, capturedImage, capturedEncoding);
      setRegState('saved');
      setStatusMsg('Face data saved successfully!');
    } catch {
      setRegState('error');
      setStatusMsg('Failed to save face data. Please try again.');
    }
  }

  function handleReset() {
    setMembershipId('');
    setMember(null);
    setCapturedImage('');
    setCapturedEncoding('');
    setRegState('idle');
    setStatusMsg('');
    stopCamera();
  }

  return (
    <div className="registration-page">
      <div className="registration-container">
        {/* Step 1: Member lookup */}
        <div className="reg-section">
          <h2 className="reg-section-title">
            <span className="step-badge">1</span>
            Member Lookup
          </h2>
          <div className="lookup-form">
            <input
              type="text"
              className="member-input"
              placeholder="Enter Membership ID"
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMemberLookup()}
              disabled={regState !== 'idle' && regState !== 'error'}
            />
            <button
              className="btn-lookup"
              onClick={handleMemberLookup}
              disabled={!membershipId.trim() || (regState !== 'idle' && regState !== 'error')}
            >
              {regState === 'loading-member' ? (
                <span className="btn-loading">Searching...</span>
              ) : 'Find Member'}
            </button>
          </div>
        </div>

        {/* Member details */}
        {member && (
          <div className="reg-section member-info-section">
            <h2 className="reg-section-title">
              <span className="step-badge">2</span>
              Member Details
            </h2>
            <div className="member-info-grid">
              <InfoItem label="Membership ID" value={member.membershipId} />
              <InfoItem label="Client Name" value={member.clientName} />
              <InfoItem label="Mobile No" value={member.mobileNo} />
              <InfoItem label="Package" value={member.packageDetails} />
              <InfoItem label="Validity" value={member.packageValidity} />
              <InfoItem label="Starting Date" value={member.startingDate} />
              <InfoItem label="Renewal Date" value={member.renewalDate} />
              <InfoItem
                label="Face Status"
                value={member.faceEncoding ? 'Registered' : 'Not Registered'}
                highlight={!member.faceEncoding}
              />
            </div>
          </div>
        )}

        {/* Step 3: Face capture */}
        {(regState === 'member-found' || regState === 'camera-ready' || regState === 'captured') && (
          <div className="reg-section">
            <h2 className="reg-section-title">
              <span className="step-badge">3</span>
              Face Capture
            </h2>

            <div className="capture-area">
              {/* Camera view */}
              {(regState === 'member-found' || regState === 'camera-ready') && (
                <>
                  <div className="video-wrapper">
                    <video ref={videoRef} className="capture-video" autoPlay muted playsInline />
                    {regState === 'camera-ready' && (
                      <div className="capture-guide">
                        <div className="guide-frame">
                          <span className="corner tl" />
                          <span className="corner tr" />
                          <span className="corner bl" />
                          <span className="corner br" />
                        </div>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {regState === 'member-found' && (
                    <button
                      className="btn-primary"
                      onClick={handleStartCamera}
                      disabled={!modelsReady}
                    >
                      {modelsReady ? 'Activate Camera' : 'Loading Models...'}
                    </button>
                  )}
                  {regState === 'camera-ready' && (
                    <button className="btn-capture" onClick={handleCapture}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="5" fill="currentColor" />
                      </svg>
                      Capture Face
                    </button>
                  )}
                </>
              )}

              {/* Captured preview */}
              {regState === 'captured' && capturedImage && (
                <div className="captured-preview">
                  <div className="preview-wrapper">
                    <img src={capturedImage} alt="Captured face" className="preview-image" />
                    <div className="preview-check">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="capture-actions">
                    <button className="btn-retake" onClick={handleRetake}>
                      Retake
                    </button>
                    <button className="btn-save" onClick={handleSave}>
                      Save Face Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saving state */}
        {regState === 'saving' && (
          <div className="status-message saving">
            <div className="spinner" />
            {statusMsg}
          </div>
        )}

        {/* Saved state */}
        {regState === 'saved' && (
          <div className="status-message success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {statusMsg}
            <button className="btn-register-another" onClick={handleReset}>
              Register Another Member
            </button>
          </div>
        )}

        {/* Error state */}
        {regState === 'error' && statusMsg && (
          <div className="status-message error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {statusMsg}
            <button className="btn-retry" onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}

        {/* Status message for camera-ready */}
        {(regState === 'camera-ready' || regState === 'captured') && statusMsg && regState !== 'captured' && (
          <p className="hint-msg">{statusMsg}</p>
        )}
        {regState === 'captured' && (
          <p className="hint-msg success-hint">{statusMsg}</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className={`info-value ${highlight ? 'highlight-warn' : ''}`}>{value || '—'}</span>
    </div>
  );
}
