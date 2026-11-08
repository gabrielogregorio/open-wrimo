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
