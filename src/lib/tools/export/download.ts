// Saves bytes as a file through a temporary link, the way a browser download starts.
export const downloadFile = (
  data: Uint8Array | string,
  fileName: string,
  type: string,
  page: Document = document,
): void => {
  const blob = new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type });
  const url = URL.createObjectURL(blob);
  const link = page.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  page.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported';

type ShareTarget = Pick<Navigator, 'share'> & { canShare?: (data: ShareData) => boolean };

/**
 * Hands a file to the system share sheet (WhatsApp, Drive, e-mail, Nearby Share…), which is how a phone
 * sends a backup to another device without any server of ours. 'unsupported' means the browser cannot
 * share files, so the caller should download it instead.
 */
export const shareFile = async (
  data: Uint8Array,
  fileName: string,
  type: string,
  target: Partial<ShareTarget> | undefined = globalThis.navigator,
): Promise<ShareOutcome> => {
  const file = new File([new Uint8Array(data)], fileName, { type });
  const payload: ShareData = { files: [file], title: fileName };

  if (!target?.share || !target.canShare?.(payload)) {
    return 'unsupported';
  }

  try {
    await target.share(payload);

    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }

    return 'unsupported';
  }
};
