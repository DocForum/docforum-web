import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';

export function RecoveryCodeActions({ codes }: { codes: string[] }) {
  const t = useT();
  const [copyError, setCopyError] = useState<string | null>(null);
  const codesText = codes.join('\n');

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codesText);
      setCopyError(null);
    } catch {
      setCopyError(
        t('auth.twoFactor.clipboardUnavailable', 'Clipboard access is unavailable. Select and copy the codes above.'),
      );
    }
  }

  function downloadCodes() {
    const url = URL.createObjectURL(new Blob([codesText], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'docforum-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {copyError && <p role="alert">{copyError}</p>}
      <Button type="button" variant="secondary" onClick={() => void copyCodes()}>
        {t('auth.twoFactor.copyCodes', 'Copy recovery codes')}
      </Button>
      <Button type="button" variant="secondary" onClick={downloadCodes}>
        {t('auth.twoFactor.downloadCodes', 'Download recovery codes')}
      </Button>
    </>
  );
}
