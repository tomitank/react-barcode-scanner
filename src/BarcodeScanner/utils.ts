import type { RefObject } from 'react';
import type { BarcodeScannerProps } from '../types';
import type { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { ChecksumException, FormatException, NotFoundException } from '@zxing/library';

type DecodeBarcodeFromConstraintsProps = Pick<BarcodeScannerProps, 'constraints' | 'onSuccess' | 'onError'>;

export async function decodeBarcodeFromConstraints(
  codeReader: BrowserMultiFormatReader,
  videoElement: RefObject<HTMLVideoElement | null>,
  { constraints, onSuccess, onError }: DecodeBarcodeFromConstraintsProps,
): Promise<IScannerControls|undefined> {
  if (!videoElement.current) return;
  try {
    return await codeReader.decodeFromConstraints(
      { audio: false, video: constraints, preferCurrentTab: true },
      videoElement.current,
      (result, error) => {
        if (result) {
          onSuccess(result.getText());
        }
        if (
          error &&
          !(error instanceof NotFoundException ||
            error instanceof ChecksumException ||
            error instanceof FormatException)
        ) {
          onError(error as Error);
        }
      }
    );
  } catch (error) {
    if (
      error &&
      !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)
    ) {
      onError(error as Error);
    }
  }
}
