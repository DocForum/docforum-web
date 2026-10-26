import { useState, useRef, useEffect, useCallback } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'active' | 'denied' | 'unsupported' | 'error';

export interface UseCameraQrScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
}

export function useCameraQrScanner({ onScan, enabled = true }: UseCameraQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on track stop
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setCameraStatus('idle');
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setErrorMessage('Camera access is not supported by your browser or environment.');
      return;
    }

    try {
      setCameraStatus('starting');
      setErrorMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // video play can be ignored if already playing or handled
        }
      }

      setCameraStatus('active');
      setIsScanning(true);

      // Setup BarcodeDetector or fallback scanner loop
      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: new (opts?: { formats: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;

      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detected = await detector.detect(videoRef.current);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              const scannedValue = detected[0].rawValue.trim();
              if (scannedValue) {
                stopCamera();
                onScan(scannedValue);
              }
            }
          } catch {
            // ignore frame parse errors
          }
        }, 250);
      } else {
        // Fallback: If BarcodeDetector is not natively supported, check if a global mock / fallback decoder was attached
        const customScanner = (window as unknown as { __mockQrScan?: (cb: (code: string) => void) => void }).__mockQrScan;
        if (customScanner) {
          customScanner((code) => {
            stopCamera();
            onScan(code);
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser or enter the order token manually below.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraStatus('unsupported');
        setErrorMessage('No camera device found on this system. Please use manual code entry.');
      } else {
        setCameraStatus('error');
        setErrorMessage(error.message || 'Unable to start camera.');
      }
      stopCamera();
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      // Ensure all media stream tracks are stopped when unmounting or leaving the screen
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  return {
    videoRef,
    cameraStatus,
    errorMessage,
    isScanning,
    startCamera,
    stopCamera,
  };
}
