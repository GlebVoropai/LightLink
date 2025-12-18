const { ipcRenderer } = require('electron');
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

// Обновление превью
function updatePreview() {
  currentH = parseInt(hue.value);
  currentS = parseFloat(sat.value);
  currentL = parseFloat(light.value);

  const s = currentS * 100;
  const l = currentL * 100;
  document.documentElement.style.setProperty('--accent-color', `hsl(${currentH}, ${s}%, ${l}%)`);
}

// Отправка цвета при движении
[hue, sat, light].forEach(slider => {
  slider.addEventListener('input', () => {
    updatePreview();
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
  for (let i = 0; i < 36; i++) {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';

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

// Инициализация
updatePreview();
renderRecentColors();
ipcRenderer.send('update-interval', currentInterval);
