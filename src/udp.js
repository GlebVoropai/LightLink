const dgram = require('dgram');
const client = dgram.createSocket('udp4');

let LED_COUNT = 60;
let IP = '192.168.1.199';
let PORT = 4210;

// переменные для хранения состояния
let currentRSSI = null;
let currentUptime = null;
let lastPacketTime = null;

client.on('message', (msg) => {
  // console.log("UDP packet:", msg.toString());
  const parts = msg.toString().trim().split(';');
  currentRSSI = parseInt(parts[0], 10);
  currentUptime = parseInt(parts[1], 10);
  lastPacketTime = Date.now();
});

function isConnected(timeout = 3000) {
  if (!lastPacketTime) return false; 
  return (Date.now() - lastPacketTime) < timeout; 
}

// обновление конфигурации
function updateConfig({ LED_COUNT: count, IP: ip, PORT: port }) {
  if (count) LED_COUNT = count;
  if (ip) IP = ip;
  if (port) PORT = port;
}

// отправка HSL
function sendRGB(r, g, b) {
  const buffer = Buffer.alloc(LED_COUNT * 3); 
  for (let i = 0; i < LED_COUNT; i++) { 
    buffer[i * 3] = r; buffer[i * 3 + 1] = g; buffer[i * 3 + 2] = b; 
  } 
  client.send(buffer, PORT, IP, (err) => {
    if (err) console.error('Ошибка отправки:', err); });
  }

// экспортируем функции и переменные
module.exports = { 
  sendRGB, 
  updateConfig, 
  getRSSI: () => currentRSSI,
  getUptime: () => currentUptime,
  isConnected
};
