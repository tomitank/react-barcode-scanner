import { styles } from './styles';
import { FiCameraOff } from 'react-icons/fi';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactEventHandler, VideoHTMLAttributes } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import type { BarcodeScannerProps as Props } from '../types';
import { decodeBarcodeFromConstraints } from './utils';
import { DecodeHintType } from '@zxing/library';

function BarcodeScanner({
  doScan = true,
  constraints = { facingMode: 'environment' },
  formats,
  onSuccess,
  onError,
  onLoad,
  onUnload,
  Viewfinder,
  containerStyle,
  videoContainerStyle,
  videoStyle,
  videoProps: passedVideoProps,
}: Props)
{
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const videoElement = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls|undefined>(null);
  const isShowingDisabledImage = !isCameraInitialized || !doScan;

  const codeReader = useMemo(() => {
    if (formats && formats.length > 0) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      return new BrowserMultiFormatReader(hints);
    }
    return new BrowserMultiFormatReader();
  }, [formats]);

  useEffect(() => {

    if (!doScan) return;

    let cancelled = false;

    if (!navigator?.mediaDevices) {
      const message = 'Your browser has no support for the MediaDevices API. You could fix this by running "npm i webrtc-adapter"';
      console.warn(`[ReactBarcodeScanner]: ${message}`);
      onError(new Error(message));
      return;
    }

    (async () => {
      const controls = await decodeBarcodeFromConstraints(codeReader, videoElement, { constraints, onSuccess, onError });
      if (!cancelled) {
        controlsRef.current = controls;
      } else {
        controls?.stop?.();
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
      controlsRef.current = undefined;

      if (videoElement.current?.srcObject) {
        const stream = videoElement.current.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        videoElement.current.srcObject = null;
      }
      onUnload?.();
    };
  }, [onSuccess, onError, onUnload, doScan, codeReader, constraints]);

  const videoProps = useMemo(() => {
    const onLoadedData: ReactEventHandler<HTMLVideoElement> = ({ nativeEvent }) => {
      const eventTarget = nativeEvent.target as HTMLVideoElement | null;

      if (!eventTarget?.readyState) return;

      if (eventTarget.readyState === eventTarget.HAVE_ENOUGH_DATA) {
        setIsCameraInitialized(true);
        onLoad?.();
      }
    };

    const defaultVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
      playsInline: true,
      disablePictureInPicture: true,
      muted: true,
      onLoadedData,
      style: {
        ...styles.video,
        ...videoStyle,
        transform: `${videoStyle?.transform ?? ''} ${constraints.facingMode === 'user' ? 'scaleX(-1)' : ''}`,
      },
    };

    if (!passedVideoProps) return defaultVideoProps;

    if (typeof passedVideoProps !== 'function') return passedVideoProps;

    return passedVideoProps(defaultVideoProps);

  }, [constraints.facingMode, onLoad, passedVideoProps, videoStyle]);

  return (
    <section style={containerStyle}>
      {isShowingDisabledImage && (
        <div style={styles.barcodeScannerError}>
          <FiCameraOff size={300} style={styles.barcodeScannerErrorSvg} />
        </div>
      )}
      <div
        style={{
          ...styles.container,
          ...(!isShowingDisabledImage ? styles.barcodeScannerVisible : {}),
          ...videoContainerStyle,
        }}
      >
        <video ref={videoElement} {...videoProps} />
        {!!Viewfinder && <Viewfinder />}
      </div>
    </section>
  );
}

BarcodeScanner.displayName = 'BarcodeScanner';

export default BarcodeScanner;
