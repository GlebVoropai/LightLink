const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { sendHSL, updateConfig } = require('./src/udp.js');
const Store = require('electron-store').default;
const store = new Store();

let win;
let debugWin;
let currentH = store.get('h', 180);
let currentS = store.get('s', 0.5);
let currentL = store.get('l', 0.5);
let currentInterval = store.get('interval', 1000);
let recentColors = store.get('recentColors', []);
let sendTimer = null;

// Инициализация параметров платы
const LED_COUNT = store.get('ledCount', 60);
const IP = store.get('ipAddress', '192.168.1.199');
const PORT = store.get('port', 4210);
updateConfig({ LED_COUNT, IP, PORT });

function startSending(interval) {
  if (sendTimer) clearTimeout(sendTimer);
  function loop() {
    sendHSL(currentH, currentS, currentL);
    sendTimer = setTimeout(loop, interval);
  }
  loop();
}

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 900,
    height: 675,
    // frame: false,
    resizable: false,
    backgroundColor: '#00000000',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  Menu.setApplicationMenu(null);

  startSending(currentInterval); // запуск отправки при старте
});

// IPC: обновление цвета
ipcMain.on('update-hsl', (event, h, s, l) => {
  currentH = h;
  currentS = s;
  currentL = l;
  store.set({ h, s, l });
  sendHSL(h, s, l);
});

// IPC: обновление интервала
ipcMain.on('update-interval', (event, interval) => {
  currentInterval = interval;
  store.set('interval', interval);
  startSending(interval);
});

// IPC: обновление параметров платы
ipcMain.on('update-udp-config', () => {
  const LED_COUNT = store.get('ledCount', 60);
  const IP = store.get('ipAddress', '192.168.1.199');
  const PORT = store.get('port', 4210);
  updateConfig({ LED_COUNT, IP, PORT });
});

// Сохранение цвета в историю при выходе
app.on('before-quit', () => {
  const color = { h: currentH, s: currentS, l: currentL };

  recentColors = recentColors.filter(c => !(c.h === color.h && c.s === color.s && c.l === color.l));
  recentColors.unshift(color);
  if (recentColors.length > 32) recentColors = recentColors.slice(0, 32);

  store.set('recentColors', recentColors);
});
