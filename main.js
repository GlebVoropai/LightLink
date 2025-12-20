const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { hslToRgb } = require('./src/convert_color.js');
const path = require('path');
const { sendRGB, updateConfig, isConnected, getRSSI, getUptime } = require('./src/udp.js');
const Store = require('electron-store').default;
const store = new Store();

let win;
let currentH = store.get('h', 180);
let currentS = store.get('s', 0.5);
let currentL = store.get('l', 0.5);
let currentInterval = store.get('interval', 1000);
let recentColors = store.get('recentColors', []);
let sendTimer = null;

// будем хранить последний RGB для автосендера
let currentRGB = hslToRgb(currentH, currentS, currentL);

// Инициализация параметров платы
const LED_COUNT = store.get('ledCount', 60);
const IP = store.get('ipAddress', '192.168.1.199');
const PORT = store.get('port', 4210);
updateConfig({ LED_COUNT, IP, PORT });

function startSending(interval) {
  if (sendTimer) clearTimeout(sendTimer);
  function loop() {
    sendRGB(...currentRGB);
    sendTimer = setTimeout(loop, interval);
  }
  loop();
}

setInterval(() => {
  if (win && win.webContents) {
    win.webContents.send('connection-status', { 
      connected: isConnected(),
      rssi: getRSSI(), 
      uptime: getUptime()
    }); 
  } 
}, 1000);

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 640,
    height: 720,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    visualEffectState: 'disabled',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.webContents.openDevTools();

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  Menu.setApplicationMenu(null);

  startSending(currentInterval);
});

// IPC: обновление RGB
ipcMain.on('update-rgb', (event, r, g, b) => {
  currentRGB = [r, g, b];   // сохраняем последний цвет
  sendRGB(r, g, b);         // сразу отправляем
});

// IPC: обновление HSL (только для сохранения истории)
ipcMain.on('update-hsl', (event, h, s, l) => {
  currentH = h;
  currentS = s;
  currentL = l;
  store.set({ h, s, l });
});

// обработчики IPC кнопки панели
ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});

ipcMain.on('window-close', () => {
  if (win) win.close();
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
