# Eksport capture va kadr transporti

Asos: System Design, R1, 5-bo‘limdagi deterministic export va cheklangan backpressure; 9-bo‘limdagi Phase 0.

## O‘lchov

Dastlabki 10 s uzluksiz motion sinovida capture 6.8 s, encoder roundtrip 6.8 s, shu jumladan FFmpeg stdin callback’i 1.0 s oldi. Render submission va evaluator birgalikda 0.3 s dan kam bo‘ldi. Demak, evaluatorni Worker’ga ko‘chirish ushbu muammoni hal qilmaydi va Word’dagi YAGNI doirasida kechiktiriladi.

Pixi `extract.pixels({ target: Container })` har chaqiruvda render texture yaratib, chizib, pixel o‘qib, texture’ni yo‘q qiladi. Preview sahnasi eksport oynasining ekraniga ham chizilar edi.

## Qaror

1. Renderer bitta qayta ishlatiladigan MSAA render texture saqlaydi. Eksport faqat shu target’ga chizadi. Preview ekranga chizadi va capture kerak bo‘lsa shu target’dan foydalanadi. Art/text/image chizish kodi va evaluator umumiy.
2. Capture olgan pixel buffer ustidan Uint8Array view qaytariladi; qo‘shimcha to‘liq RGBA nusxasi yaratilmaydi. Encoder promise tugaguncha bufferni faqat o‘qiydi, uni detach yoki mutate qilmaydi.
3. Pipeline’da bitta yozilayotgan va bitta tayyorlanayotgan kadr bo‘lishi mumkin. Ikkinchi write birinchi ACK’dan oldin yuborilmaydi. Bu GPU ishini IPC/pipe kutishi bilan ustma-ust bajaradi. Navbat va xotira cheklangan, vaqt hamon `round(frameIndex × 1000 / fps)` orqali olinadi.
4. Flat vector kadrlar MessagePort’da yo‘qotishsiz `rle32` paketiga aylantiriladi. Paket 1 MiB bilan cheklangan; murakkab/noisy rasmda encoder erta raw RGBA’ga qaytadi. Har bir run count va 32-bit RGBA rangni saqlaydi. Decoder qat’iy target o‘lchami, uzunlik, count, overflow va tugallangan pixel sonini tekshiradi. Portdan keyin FFmpeg yana asl RGBA oladi.

Bu video sifatini pasaytiruvchi codec emas: transport roundtrip testi har bir RGBA baytining tengligini tekshiradi. Loyiha formati v1 va `Encoder.writeFrame(RawFrame)` porti o‘zgarmaydi. ArrayBuffer ownership transferi haqidagi Electron cheklovi uchun avvalgi [qaror](0001-frame-transport.md) saqlanadi.

## Dalillar va chegaralar

- Oldingi capture’dan olingan 5 golden PNG saqlangan. Rest, ikki wave pose, motion tugashi va kamera bilan oldinga/orqaga seek tekshiriladi. Yangi preview va eksport hash’lari o‘zaro aynan teng. Original golden bilan solishtirganda 9 ta matn pikselida 8-bit kanalning 1 darajali rounding farqi kuzatildi; test maksimum 16 piksel, maksimum 1 darajaga ruxsat beradi. Golden fayllar optimizatsiyadan keyin almashtirilmagan. Bir parallel GPU sinovida 48 ta text-edge pikselida shu 1 darajali farq kuzatildi; izolyatsiyalangan qayta sinov o‘tdi. Shu sabab Playwright golden bosqichi workflow/native-export kontekstlari yopilgach bajariladi; tolerance oshirilmadi. Per-frame hash va farqlar `.qa/golden-diffs/comparison.json`ga yoziladi.
- RLE ixtiyoriy pixel/rang ketma-ketliklari, uzun run, noise/raw fallback, misaligned view, noto‘g‘ri paket va overflow bilan tekshiriladi.
- `writeMs` jami roundtrip, `waitMs` faqat haqiqiy kutish. Pipeline overlap sabab stage summasi `totalMs` bilan bir xil bo‘lishi shart emas. `transportMs` IPC, nusxalar va scheduling qoldig‘i; sof tarmoq vaqti emas.
- `wireBytes` faqat payload baytlari; IPC header’lari kirmaydi. Working-set o‘lchovi davriy sample va process yig‘indisi; unique RAM emas.
- To‘liq 60 s uzluksiz motion + audio sinovi **47.443 s**, **1 800 kadr**, video/audio **60.000 s**, marker farqi **0.0208 ms** bilan o‘tdi. Raw kadr payload’i 14 929 920 000 baytdan 350 946 288 baytga tushdi. [Hisobot](../benchmarks/windows-1080p60s-audio-continuous.json). Windows/i5-12400/UHD 730 natijasi; bitta character, 10-character stress yoki uch OS natijasi emas. Oldingi 142.845 s baseline’da motion faqat boshida faol edi, shu sabab ikkala holat orasidagi aniq foizni faqat ushbu o‘zgartirishlarga nisbat berib bo‘lmaydi.
