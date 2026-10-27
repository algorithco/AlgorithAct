# Electron kadr transporti

Sana: 2026-10-25.

System Design hujjatida ArrayBuffer ownership transfer orqali yashirin renderer → main → FFmpeg yo‘li taklif qilingan. Haqiqiy Electron end-to-end sinovida `port.postMessage(frame, [frame.rgba.buffer])` main processga `null` berdi.

Electron `MessagePortMain` kontraktidagi transfer ro‘yxati `MessagePortMain[]`; DOM renderer’dagi umumiy transfer ro‘yxati bilan bir xil emas. Bu holat Electron loyihasining [34905 muammosi](https://github.com/electron/electron/issues/34905) va [rasmiy MessagePortMain kontrakti](https://www.electronjs.org/docs/latest/api/message-port-main) bilan mos keladi.

Alpha qarori: portning o‘zi isolated preload’dan main world’ga transfer qilinadi; RGBA kadr esa `postMessage(frame)` orqali structured clone bilan uzatiladi. Har kadr uchun main process FFmpeg stdin callback’ini kutib, keyin ACK yuboradi. Navbatda bitta kadrdan ortiq ish bo‘lmaydi. `runExport` va `Encoder` kontraktlari o‘zgarmaydi.

Bu zero-copy pipeline emas. 1080p/30 eksport tezligi va xotira byudjeti alohida benchmark bilan o‘lchanishi kerak. Zarurat aniqlansa, kelajakda native shared buffer yoki alohida utility process transporti shu port ortida almashtiriladi.
