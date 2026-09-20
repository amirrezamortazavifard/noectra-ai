export interface OcrWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
}

export interface OcrPageResponse {
  success: boolean;
  text: string;
  lines: OcrLine[];
  wordCount: number;
  latencyMs: number;
  error?: string;
}

export interface OcrStatusResponse {
  isSupported: boolean;
  engineName: string;
  availableLanguages: string[];
}

class OcrService {
  private cachedStatus: OcrStatusResponse | null = null;

  async getStatus(): Promise<OcrStatusResponse> {
    if (this.cachedStatus) return this.cachedStatus;
    try {
      const res = await fetch('/api/ocr/status');
      if (res.ok) {
        const data = await res.json();
        this.cachedStatus = data;
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch OCR status:', e);
    }
    return {
      isSupported: false,
      engineName: 'Unknown',
      availableLanguages: ['en-US'],
    };
  }

  async recognizePageImage(
    imageBase64: string,
    language?: string
  ): Promise<OcrPageResponse> {
    const res = await fetch('/api/ocr/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        language,
      }),
    });

    const data: OcrPageResponse = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'OCR recognition failed on current page');
    }

    return data;
  }
}

export const ocrService = new OcrService();
