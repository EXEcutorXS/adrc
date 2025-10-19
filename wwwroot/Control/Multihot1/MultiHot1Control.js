// script.js

// --------- CONFIG ---------
// NOTE: Browsers cannot speak raw TCP (1883). Your broker must expose MQTT over WebSockets.
// If this page is served via HTTPS, switch to wss:// and ensure a valid cert on the broker.
let WS_URL = 'wss://' + window.location.hostname + ':8084'; // Change if your WS listener differs
//let WS_URL = 'wss://' + 'telematic.space' + ':8084'; // Change if your WS listener differs
let USERNAME = localStorage.getItem('userName')                          // (requested)
let PASSWORD = localStorage.getItem('jwtToken')                        // (requested)
const DEVICE_ID = 0;

let dayTimeout;
let fanTimeout;
let nightTimeout;

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
  // Добавляем интерактивность кнопкам

  function createPicker(containerId, values, initialValue, unit = '', changeCallback) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Добавляем пустые элементы в начале и конце для возможности выбора крайних значений
    const addPaddingItems = (count) => {
      for (let i = 0; i < count; i++) {
        const paddingItem = document.createElement('div');
        paddingItem.className = 'picker-item padding';
        paddingItem.style.visibility = 'hidden';
        container.appendChild(paddingItem);
      }
    };

    // Добавляем отступы в начале
    addPaddingItems(1);

    // Добавляем основные элементы
    values.forEach(value => {
      const item = document.createElement('div');
      item.className = 'picker-item';
      if (value == initialValue) {
        item.classList.add('selected');
      }
      item.textContent = value + unit;
      item.dataset.value = value;
      container.appendChild(item);
    });

    // Добавляем отступы в конце
    addPaddingItems(1);

    // Настройка прокрутки с защелкиванием
    let isScrolling = false;

    container.addEventListener('scroll', function () {
      if (!isScrolling) {
        adjustScroll(this);
      }
    });

    container.addEventListener('touchstart', function () {
      isScrolling = true;
    });

    container.addEventListener('touchend', function () {
      isScrolling = false;
      adjustScroll(this);
      changeCallback();
    });

    // Настройка для десктопных устройств
    container.addEventListener('wheel', function (e) {
      e.preventDefault();

      // Определяем высоту одного элемента
      const items = this.querySelectorAll('.picker-item');
      const itemHeight = items.length > 0 ? items[0].offsetHeight : 40;

      // Определяем направление скролла
      const direction = Math.sign(e.deltaY);

      // Вычисляем целевую позицию прокрутки
      let targetScroll = this.scrollTop + (direction * itemHeight);

      // Ограничиваем прокрутку в допустимых пределах
      const maxScroll = this.scrollHeight - this.offsetHeight;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      // Прокручиваем к целевой позиции
      this.scrollTop = targetScroll;

      adjustScroll(this);
      changeCallback();
    });

    // Функция для установки значения извне
    const setValue = (newValue) => {
      // Убираем класс selected у всех элементов
      const items = container.querySelectorAll('.picker-item');
      items.forEach(item => item.classList.remove('selected'));
      
      // Находим элемент с нужным значением и добавляем класс selected
      const targetItem = container.querySelector(`[data-value="${newValue}"]`);
      if (targetItem) {
        targetItem.classList.add('selected');
        
        // Прокручиваем к выбранному элементу
        const targetPosition = targetItem.offsetTop - (container.offsetHeight / 2 - targetItem.offsetHeight / 2);
        const maxScroll = container.scrollHeight - container.offsetHeight;
        container.scrollTop = Math.max(0, Math.min(targetPosition, maxScroll));
      }
    };
	
    // Установим начальную позицию
    setTimeout(() => {
      const selected = container.querySelector('.selected');
      if (selected) {
        // Вычисляем позицию с учетом ограничений
        const targetPosition = selected.offsetTop - (container.offsetHeight / 2 - selected.offsetHeight / 2);
        const maxScroll = container.scrollHeight - container.offsetHeight;

        // Ограничиваем позицию в допустимых пределах
        container.scrollTop = Math.max(0, Math.min(targetPosition, maxScroll));
      }
    }, 100);
	
	    // Возвращаем объект с методами для управления пикером
    return {
      setValue: setValue,
      getValue: () => {
        const selected = container.querySelector('.picker-item.selected');
        return selected ? selected.dataset.value : null;
      }
    };
  }

  function adjustScroll(container) {
    const items = container.querySelectorAll('.picker-item');
    const containerHeight = container.offsetHeight;
    const containerMiddle = container.scrollTop + containerHeight / 2;

    let selectedItem = null;
    let minDistance = Number.MAX_VALUE;

    items.forEach(item => {
      const itemMiddle = item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(itemMiddle - containerMiddle);

      if (distance < minDistance) {
        minDistance = distance;
        selectedItem = item;
      }
    });

    if (selectedItem) {
      const targetScroll = selectedItem.offsetTop - (containerHeight / 2 - selectedItem.offsetHeight / 2);

      // Плавная прокрутка к выбранному элементу
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });

      items.forEach(item => item.classList.remove('selected'));
      selectedItem.classList.add('selected');

      // Обновляем значение скорости вентилятора в списке параметров
      if (container.id === 'fan-speed-picker') {
        document.getElementById('current-fan-speed').textContent = selectedItem.dataset.value + '%';
      }
    }
  }

  // Генерируем значения для барабанов
  const dayTemps = [];
  for (let i = 10; i <= 32; i += 1) {
    dayTemps.push(i);
  }

  const nightTemps = [];
  for (let i = 10; i <= 32; i += 1) {
    nightTemps.push(i);
  }

  const fanSpeeds = [];
  for (let i = 10; i <= 100; i += 1) {
    fanSpeeds.push(i);
  }

  function daySetpointUpdated() {
    clearTimeout(dayTimeout);
    dayTimeout = setTimeout(() => {
      updateDaySetpoint();
    }, 1000);
  }

  function nightSetpointUpdated() {
    clearTimeout(nightTimeout);
    nightTimeout = setTimeout(() => {
      updateNightSetpoint();
    }, 1000);

  }

  function fanPercentUpdated() {
    clearTimeout(fanTimeout);
    fanTimeout = setTimeout(() => {
      updateFanPercent();
    }, 1000);

  }
  // Инициализируем барабаны
  let dayPicker = createPicker('day-temp-picker', dayTemps, 22, '°C', daySetpointUpdated);
  let fanPicker = createPicker('fan-speed-picker', fanSpeeds, 75, '%', fanPercentUpdated);
  let nightPicker = createPicker('night-temp-picker', nightTemps, 20, '°C', nightSetpointUpdated);



  function getTopic(endPoint) { return USERNAME + '/' + DEVICE_ID + '/' + endPoint; }

  // ---------------------------

  const $ = (s) => document.querySelector(s);
  const log = (m) => { const L = $('#log'); const t = new Date().toLocaleTimeString(); L.textContent += `[${t}] ${m}\n`; L.scrollTop = L.scrollHeight; };
  const setDot = (color, glow) => { const d = $('#statusDot'); d.style.background = color; d.style.boxShadow = glow; };
  const setStatus = (t) => $('#statusText').textContent = t;

  $('#brokerUrl').textContent = WS_URL;

  // mqtt.js client
  const clientId = 'web_dev1_' + Math.random().toString(16).slice(2);
  const options = {
    clientId,
    username: USERNAME,
    password: PASSWORD,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 30_000,
  };

  const client = mqtt.connect(WS_URL, options);

  client.on('connect', () => {
    setStatus('Подключено (' + clientId + ')');
    setDot('#22c55e', '0 0 0 2px rgba(34,197,94,.25)');
    log('Соединение установлено');

    log('Подписываемся');
    client.subscribe(getTopic('#'), (err, granted) => {
      if (err) console.error('Subscribe error:', err);
      else console.log('Subscribed:', granted);
    });
  });

  client.on('reconnect', () => {
    setStatus('Повторное подключение…');
    setDot('#f59e0b', '0 0 0 2px rgba(245,158,11,.25)');
  });

  client.on('close', () => {
    setStatus('Отключено');
    setDot('#ef4444', '0 0 0 2px rgba(239,68,68,.25)');
  });

  client.on('error', (e) => {
    log('Ошибка клиента: ' + (e?.message || e));
  });

  client.on('message', (topic, payload) => {
    log(`Сообщение ← ${topic} : "${payload}"`);
    // If someone else publishes to the same topic with "1"/"0", reflect it
    if (topic === getTopic('btnHtr')) {
      if (payload == 0) $('#buttonHeater').classList.remove('active');
      if (payload == 1) $('#buttonHeater').classList.add('active');
    }

    if (topic === getTopic('btnTen')) {
      if (payload == 0) $('#buttonElement').classList.remove('active');
      if (payload == 1) $('#buttonElement').classList.add('active');
    }

    if (topic === getTopic('btnWater')) {
      if (payload == 0) $('#buttonWater').classList.remove('active');
      if (payload == 1) $('#buttonWater').classList.add('active');
    }

    if (topic === getTopic('btnHeatFan')) {
      if (payload == 0) $('#buttonFurnace').classList.remove('active');
      if (payload == 1) $('#buttonFurnace').classList.add('active');
    }

      if (topic === getTopic('sunTemp')) {
          dayPicker.setValue(payload)
          $('#actualDaySetpoint').textContent = payload + '°'
      }

    if (topic === getTopic('moonTemp'))
	{
		nightPicker.setValue(payload)
      $('#actualNightSetpoint').textContent = payload + '°'
	}

      if (topic === getTopic('paramFan')) {
          fanPicker.setValue(payload)
          $('#actualFanSpeed').textContent = payload + '%'
      }

    if (topic === getTopic('airTemp'))
      $('#LabelCabinTemp').textContent = payload + "°C"

    if (topic === getTopic('tankValue'))
      $('#LabelTankTemp').textContent = payload + "°C"

    if (topic === getTopic('voltage'))
      $('#LabelVoltage').textContent = payload + " V"

    if (topic === getTopic('heatValue'))
      $('#LabelHeatExchangerTemp').textContent = payload + "°"

    if (topic === getTopic('pressure'))
      $('#LabelPressure').textContent = payload + " кПа"

    if (topic === getTopic('pumpStatus')) {
      $('#LabelPumpStatus').textContent = payload == 1 ? "Активна" : "Не активна";
      if (payload == 1)
        $('#LabelPumpStatus').classList.remove('status-inactive');
      else
        $('#LabelPumpStatus').classList.add('status-inactive');
    }

    if (topic === getTopic('solenoidStatus')) {
      $('#LabelSolenoidStatus').textContent = payload == 1 ? "Активен" : "Не активен";
      if (payload == 1)
        $('#LabelSolenoidStatus').classList.remove('status-inactive');
      else
        $('#LabelSolenoidStatus').classList.add('status-inactive');
    }

  });

  $('#buttonHeater').addEventListener('click', function () {

    const payload = $('#buttonHeater').className.includes('active') ? '0' : '1';
    client.publish(getTopic('btnHtr'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('btnHtr')} : "${payload}"`);
    });
  });


  $('#buttonElement').addEventListener('click', function () {

    const payload = $('#buttonElement').className.includes('active') ? '0' : '1';
    client.publish(getTopic('btnTen'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('btnTen')} : "${payload}"`);
    });
  });

  $('#buttonWater').addEventListener('click', function () {

    const payload = $('#buttonWater').className.includes('active') ? '0' : '1';
    client.publish(getTopic('btnWater'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('btnWater')} : "${payload}"`);
    });
  });

  $('#buttonFurnace').addEventListener('click', function () {

    const payload = $('#buttonFurnace').className.includes('active') ? '0' : '1';
    client.publish(getTopic('btnHeatFan'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('btnHeatFan')} : "${payload}"`);
    });
  });

  function updateDaySetpoint() {
    const payload = $('#day-temp-picker').querySelector('.selected').getAttribute('data-value');
    client.publish(getTopic('sunTemp'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('sunTemp')} : "${payload}"`);
    });
  }

  function updateNightSetpoint() {
    const payload = $('#night-temp-picker').querySelector('.selected').getAttribute('data-value');
    client.publish(getTopic('moonTemp'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('moonTemp')} : "${payload}"`);
    });
  }

  function updateFanPercent() {
    const payload = $('#fan-speed-picker').querySelector('.selected').getAttribute('data-value');
    client.publish(getTopic('paramFan'), payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        log('Ошибка публикации: ' + err.message);
        return;
      }
      log(`Публикация → ${getTopic('paramFan')} : "${payload}"`);
    });
  }
});