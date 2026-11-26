export const LINE_WIDTH = 48;

const ESC = 0x1b;
const GS = 0x1d;
const CODE_PAGE_CP858 = 19;

const cp858High = [
  'ÇüéâäàåçêëèïîìÄÅ',
  'ÉæÆôöòûùÿÖÜø£Ø×ƒ',
  'áíóúñÑªº¿®¬½¼¡«»',
  '░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐',
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤',
  'ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀',
  'ÓßÔÒõÕµþÞÚÛÙýÝ¯´',
  '\u00ad±‗¾¶§÷¸°¨·¹³²■\u00a0',
].join('');

const cp858 = new Map([...cp858High].map((char, index) => [char, 0x80 + index]));

export function encodeText(text) {
  const bytes = [];
  for (const char of text.normalize('NFC')) {
    const code = char.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else bytes.push(cp858.get(char) ?? 0x3f);
  }
  return bytes;
}

export function wrapText(text, width = LINE_WIDTH) {
  return text.replace(/\r\n?/g, '\n').split('\n').flatMap((line) => {
    const lines = [];
    let rest = line.trimEnd();
    while ([...rest].length > width) {
      const chars = [...rest];
      let cut = chars.slice(0, width + 1).lastIndexOf(' ');
      if (cut <= 0) cut = width;
      lines.push(chars.slice(0, cut).join('').trimEnd());
      rest = chars.slice(cut).join('').trimStart();
    }
    lines.push(rest);
    return lines;
  });
}

function textLines(text, bytes) {
  for (const line of wrapText(text)) bytes.push(...encodeText(line), 0x0a);
}

function centered(text, bytes, { bold = false, tall = false } = {}) {
  bytes.push(ESC, 0x61, 1);
  if (bold) bytes.push(ESC, 0x45, 1);
  if (tall) bytes.push(GS, 0x21, 0x01);
  textLines(text, bytes);
  if (tall) bytes.push(GS, 0x21, 0x00);
  if (bold) bytes.push(ESC, 0x45, 0);
  bytes.push(ESC, 0x61, 0);
}

export function buildTicket(ticket) {
  const bytes = [ESC, 0x40, ESC, 0x74, CODE_PAGE_CP858];
  if (ticket.title) centered(ticket.title, bytes, { bold: true, tall: true });
  bytes.push(0x0a);
  textLines(ticket.content, bytes);
  if (ticket.footer) {
    bytes.push(0x0a);
    centered(ticket.footer, bytes);
  }
  bytes.push(ESC, 0x64, 4, GS, 0x56, 0x42, 0x00);
  return Uint8Array.from(bytes);
}
