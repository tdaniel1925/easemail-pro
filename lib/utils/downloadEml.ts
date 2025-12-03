/**
 * Download email as .eml file
 */
export async function downloadEml(messageId: string, accountId: string, subject?: string) {
  try {
    const response = await fetch(
      `/api/email/download-eml?messageId=${messageId}&accountId=${accountId}`
    );

    if (!response.ok) {
      throw new Error('Failed to download email');
    }

    // Get the blob
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Get filename from Content-Disposition header or generate one
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'email.eml';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) {
        filename = match[1];
      }
    } else if (subject) {
      filename = `${subject.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.eml`;
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Error downloading email:', error);
    throw error;
  }
}
