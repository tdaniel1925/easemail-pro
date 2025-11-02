/**
 * WebM to MP3 Converter
 * Converts WebM audio blobs to MP3 format for better email compatibility
 */

import * as lamejs from '@breezystack/lamejs';

export async function convertWebMToMP3(webmBlob: Blob): Promise<Blob> {
  console.log('🎵 Converting WebM to MP3...');
  console.log('📦 Input size:', webmBlob.size, 'bytes');

  // Decode WebM to raw PCM audio
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  console.log('🎤 Audio decoded:', {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  });

  // Get audio data
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;

  // Convert to mono if stereo (MP3 encoder works better with mono for voice)
  const audioData = channels === 2
    ? mergeChannels(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1))
    : audioBuffer.getChannelData(0);

  // Convert Float32Array to Int16Array (required by MP3 encoder)
  const int16Data = convertFloat32ToInt16(audioData);

  console.log('🔢 Audio data prepared:', int16Data.length, 'samples');

  // Encode to MP3
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // 1 channel (mono), sample rate, 128kbps bitrate
  const mp3Data: Int8Array[] = [];
  const sampleBlockSize = 1152; // Must be multiple of 576 for MP3 encoder

  for (let i = 0; i < int16Data.length; i += sampleBlockSize) {
    const sampleChunk = int16Data.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  console.log('✅ MP3 encoding complete:', mp3Data.length, 'chunks');

  // Create MP3 blob
  const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
  console.log('📦 Output size:', mp3Blob.size, 'bytes');
  console.log('💾 Size reduction:', Math.round((1 - mp3Blob.size / webmBlob.size) * 100) + '%');

  return mp3Blob;
}

/**
 * Merge stereo channels to mono
 */
function mergeChannels(left: Float32Array, right: Float32Array): Float32Array {
  const merged = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    merged[i] = (left[i] + right[i]) / 2;
  }
  return merged;
}

/**
 * Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
 */
function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

