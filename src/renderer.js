const { ipcRenderer } = require('electron');
const { hslToRgb } = require('./convert_color.js');
const Store = require('electron-store').default;
const store = new Store();

// UI элементы
const hue = document.getElementById('hue');
const sat = document.getElementById('sat');
const light = document.getElementById('light');
const intervalSlider = document.getElementById('interval');
const intervalValue = document.getElementById('intervalValue');
const recentContainer = document.getElementById('recentColors');
const ledCountInput = document.getElementById('ledCount');
const ipInput = document.getElementById('ipAddress');
const portInput = document.getElementById('port');
const connectionState = document.getElementById('connectionState');
const rssiValue = document.getElementById('rssiValue');
const uptimeEl = document.getElementById('uptime');
const startInTrayCheckbox = document.getElementById('startInTray');

// Загрузка сохранённых параметров
let currentH = store.get('h', 180);
let currentS = store.get('s', 0.5);
let currentL = store.get('l', 0.5);
let currentInterval = store.get('interval', 1000);
let recentColors = store.get('recentColors', []);
ledCountInput.value = store.get('ledCount', 60);
ipInput.value = store.get('ipAddress', '192.168.1.199');
portInput.value = store.get('port', 4210);

// Установка начальных значений
hue.value = currentH;
sat.value = currentS;
light.value = currentL;
intervalSlider.value = currentInterval;
intervalValue.textContent = currentInterval;

document.getElementById('min-btn').addEventListener('click', () => {
  ipcRenderer.send('window-minimize');
});

document.getElementById('close-btn').addEventListener('click', () => {
  ipcRenderer.send('window-close');
});


// Обновление превью
function updatePreview() {
  currentH = parseInt(hue.value);
  currentS = parseFloat(sat.value);
  currentL = parseFloat(light.value);

  const s = currentS * 100;
  const l = currentL * 100;
  document.documentElement.style.setProperty('--accent-color', `hsl(${currentH}, ${s}%, ${l}%)`);
}

// Обновление статуса устройства
function updateWifiIcon(rssi) {
  let bars = 0;
  if (rssi > -50) bars = 5;
  else if (rssi > -60) bars = 4;
  else if (rssi > -70) bars = 3;
  else if (rssi > -80) bars = 2;
  else if (rssi > -90) bars = 1;
  else bars = 0;

  for (let i = 1; i <= 5; i++) {
    const bar = document.getElementById(`wifi-bar-${i}`);
    if (i <= bars) bar.classList.add('active');
    else bar.classList.remove('active');
  }
}

ipcRenderer.on('connection-status', (event, data) => { 
  if (data.connected) { 
    connectionState.textContent = "Подключено"; 
    connectionState.style.color = "var(--accent-color)"; 
  } else { 
    connectionState.textContent = "Отключено";
  } 

  if (data.rssi !== null) {
    rssiValue.textContent = data.rssi + " dBm";
    updateWifiIcon(data.rssi);
  }

  if (data.uptime !== null) {
    uptimeEl.textContent = formatUptime(data.uptime);
  }
});

//проверка состояния чекбокса трея
ipcRenderer.invoke('get-start-in-tray').then(value => {
  startInTrayCheckbox.checked = value;
});

startInTrayCheckbox.addEventListener('change', () => {
  ipcRenderer.send('set-start-in-tray', startInTrayCheckbox.checked);
});

// Отправка цвета при движении
[hue, sat, light].forEach(slider => {
  slider.addEventListener('input', () => {
    updatePreview();
    const [r, g, b] = hslToRgb(currentH, currentS, currentL);
    ipcRenderer.send('update-rgb', r, g, b);
    ipcRenderer.send('update-hsl', currentH, currentS, currentL);
  });
});

// Отправка интервала
intervalSlider.addEventListener('input', () => {
  const newInterval = parseInt(intervalSlider.value);
  intervalValue.textContent = newInterval;
  store.set('interval', newInterval);
  ipcRenderer.send('update-interval', newInterval);
});

// Отображение недавних цветов
function renderRecentColors() {
  recentContainer.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.tabIndex = 0;
    swatch.setAttribute('role', 'button');

    swatch.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        swatch.click();
      }
    });


    const color = recentColors[i];
    if (color) {
      swatch.style.background = `hsl(${color.h}, ${color.s * 100}%, ${color.l * 100}%)`;
      swatch.style.boxShadow = `0 0 2px 0 hsl(${color.h}, ${color.s * 100}%, ${color.l * 100}%)`;
      swatch.title = `h:${color.h} s:${color.s} l:${color.l}`;
      swatch.onclick = () => {
        hue.value = color.h;
        sat.value = color.s;
        light.value = color.l;
        updatePreview();

        const [r, g, b] = hslToRgb(color.h, color.s, color.l);
        ipcRenderer.send('update-rgb', r, g, b);
        ipcRenderer.send('update-hsl', color.h, color.s, color.l);
      };
    } else {
      swatch.style.background = '#222';
    }

    recentContainer.appendChild(swatch);
  }
}

// Обновление параметров платы
[ledCountInput, ipInput, portInput].forEach(input => {
  input.addEventListener('change', () => {
    store.set('ledCount', parseInt(ledCountInput.value));
    store.set('ipAddress', ipInput.value);
    store.set('port', parseInt(portInput.value));
    ipcRenderer.send('update-udp-config');
  });
});

// Форматирование времени
function formatUptime(seconds) { 
  if (seconds == null) return ''; 
  const hrs = Math.floor(seconds / 3600); 
  const mins = Math.floor((seconds % 3600) / 60); 
  const secs = seconds % 60; 
  return `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`; 
}

// Инициализация
updatePreview();
renderRecentColors();
ipcRenderer.send('update-interval', currentInterval);
