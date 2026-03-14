import * as faceapi from 'face-api.js';
import { MODEL_URL, FACE_THRESHOLD } from '../config';
import type { Member } from './sheetsService';

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function detectFaceDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export async function detectFaceDescriptorFromCanvas(
  canvas: HTMLCanvasElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface MatchResult {
  member: Member;
  distance: number;
}

export function findBestMatch(
  descriptor: Float32Array,
  members: Member[]
): MatchResult | null {
  let bestMatch: MatchResult | null = null;

  for (const member of members) {
    if (!member.faceEncoding) continue;
    try {
      const stored = new Float32Array(JSON.parse(member.faceEncoding));
      const dist = euclideanDistance(descriptor, stored);
      if (dist < FACE_THRESHOLD) {
        if (!bestMatch || dist < bestMatch.distance) {
          bestMatch = { member, distance: dist };
        }
      }
    } catch {
      continue;
    }
  }

  return bestMatch;
}

export function descriptorToString(descriptor: Float32Array): string {
  return JSON.stringify(Array.from(descriptor));
}

export function compressImageToBase64(
  canvas: HTMLCanvasElement,
  maxWidth = 200,
  quality = 0.6
): string {
  const offscreen = document.createElement('canvas');
  const ratio = Math.min(maxWidth / canvas.width, maxWidth / canvas.height);
  offscreen.width = canvas.width * ratio;
  offscreen.height = canvas.height * ratio;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
  return offscreen.toDataURL('image/jpeg', quality);
}
