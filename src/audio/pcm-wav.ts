export interface PcmBuffer { length: number; numberOfChannels: number; sampleRate: number; getChannelData(channel: number): Float32Array }

export function encodePcmWav(buffer: PcmBuffer): Uint8Array {
  const channels = buffer.numberOfChannels, dataBytes = buffer.length * channels * 2;
  if (channels < 1 || channels > 2 || dataBytes > 100_000_000) throw new Error('Audio miks hajmi qo‘llanmaydi.');
  const bytes = new Uint8Array(44 + dataBytes), view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, dataBytes, true);
  const planes = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) for (let channel = 0; channel < channels; channel++) {
    const value = Math.max(-1, Math.min(1, planes[channel][i]));
    view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true); offset += 2;
  }
  return bytes;
}
