export interface DeepgramTranscriptionResult {
  text: string;
  speaker?: string;
  language?: string;
  confidence?: number;
  rawResponse?: any;
}

export async function transcribeAudioChunk(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<DeepgramTranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.warn('[Deepgram] No DEEPGRAM_API_KEY configured. Returning simulated transcript.');
    return {
      text: '[Demo audio chunk captured. Please set DEEPGRAM_API_KEY in .env.local to enable live transcription.]',
      speaker: 'Speaker 1',
      language: 'en',
      confidence: 0.99,
    };
  }

  // Deepgram Listen endpoint with Nova-3, auto-detect language, diarization, and smart formatting
  const params = new URLSearchParams({
    model: 'nova-3',
    detect_language: 'true',
    diarize: 'true',
    smart_format: 'true',
    punctuate: 'true',
    paragraphs: 'true',
  });

  const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const channel = data?.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  const transcript = alternative?.transcript?.trim() || '';
  const confidence = alternative?.confidence || 0.9;
  const detectedLanguage = data?.results?.channels?.[0]?.detected_language || 'auto';

  // Extract speaker if available from words/paragraphs
  let speaker: string | undefined = undefined;
  if (alternative?.words && alternative.words.length > 0) {
    const speakerNum = alternative.words[0]?.speaker;
    if (speakerNum !== undefined && speakerNum !== null) {
      speaker = `Speaker ${Number(speakerNum) + 1}`;
    }
  }

  return {
    text: transcript,
    speaker,
    language: detectedLanguage,
    confidence,
    rawResponse: data,
  };
}
