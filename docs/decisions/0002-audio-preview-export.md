# Audio preview va eksport

Sana: 2026-10-25.

`AudioClip` avvaldan format v1 tarkibida bor. Ushbu bosqichda format o‘zgarmadi: `startMs`, `durationMs`, `trimInMs`, `gain`, `fadeInMs`, `fadeOutMs`, `muted` preview va eksportda ishlatildi.

`audio/clip-schedule.ts` klipni sahna, seek va manba chegaralari bilan kesadi. Bir xil offset, davomiylik va gain envelope realtime `AudioContext` hamda `OfflineAudioContext` uchun ishlatiladi. Fade’lar ustma-ust tushsa, ularning haqiqiy kesishish nuqtasi hisoblanadi.

Audio mavjud bo‘lsa, preview audio chiqish soatiga bog‘lanadi. `getOutputTimestamp` mavjud qiymat qaytarganda uning output va performance vaqtlaridan foydalaniladi; boshlang‘ich fallback — `currentTime`. Audio bo‘lmagan sahna `performance.now()` orqali ijro etiladi. Bu [Web Audio output timestamp kontrakti](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp)ga asoslangan.

Eksportda avval kadr soni `ceil(durationMs × fps / 1000)` bilan aniqlanadi. Offline audio aynan `frameCount / fps` davomiylikka, 48 kHz stereo PCM16 WAV sifatida miks qilinadi. Manba trim’i va seek offset’i [AudioBufferSourceNode.start](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start) orqali qo‘llanadi; [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering) tayyor PCM bufferini beradi.

FFmpeg avval videoni yozadi. Finalize bosqichida PCM vaqtinchalik faylga yozilib, video stream copy bilan MP4/AAC yoki WebM/Opus sifatida birlashtiriladi. FFprobe video kadrlarini, umumiy davomiylikni, stereo/48 kHz audio va boshlanish vaqtini tekshiradi. Shundan so‘ng yakuniy fayl atomik almashtiriladi. Cancel encoder, mux/probe jarayoni va vaqtinchalik fayllarni tozalaydi.

Chegaralar: audio importi 50 MB, bitta audio 5 daqiqa va dekodlangan hajmi 128 MB, loyiha audio keshi 192 MB. Bir xil SHA-256 ma’lumotlar cache’da bir marta dekodlanadi. Ko‘p soatli media va diskka oqimli audio miks ushbu bosqichga kirmaydi.

Sinovlar gain, kechiktirilgan boshlanish, trim, fade, mute, WAV header/samples, audio aktivlari bilan `.anim` roundtrip va haqiqiy video/audio dekodlashni qamrab oladi. Uzoq eksport natijasi `docs/benchmarks/` ichida alohida qayd etiladi; bir muhitdagi o‘lchov barcha qurilmalar uchun kafolat emas.
