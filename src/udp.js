const dgram = require('dgram');
const client = dgram.createSocket('udp4');

let LED_COUNT = 60;
let IP = '192.168.1.199';
let PORT = 4210;

function updateConfig({ LED_COUNT: count, IP: ip, PORT: port }) {
  if (count) LED_COUNT = count;
  if (ip) IP = ip;
  if (port) PORT = port;
}

function sendHSL(h, s, l) {
  const buffer = Buffer.alloc(LED_COUNT * 3);
  for (let i = 0; i < LED_COUNT; i++) {
    buffer[i * 3] = Math.round(h / 360 * 255);
    buffer[i * 3 + 1] = Math.round(s * 255);
    buffer[i * 3 + 2] = Math.round(l * 255);
  }

  client.send(buffer, PORT, IP, (err) => {
    if (err) console.error('Ошибка отправки:', err);
    else console.log(`Отправлено HSL(${h}, ${s}, ${l}) → ${IP}:${PORT}`);
  });
}

module.exports = { sendHSL, updateConfig };
