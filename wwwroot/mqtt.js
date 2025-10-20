async function scanMQTTDevices(serverUrl, login, password, maxDevices = 7) {
    return new Promise((resolve, reject) => {
        const devices = [];
        let client = null;
        let completed = false;

        updateStatus('Connecting to MQTT server...');

        try {
            // Подключаемся к MQTT серверу
            client = mqtt.connect(serverUrl, {
                username: login,
                password: password,
                clean: true,
                connectTimeout: 3000,
                reconnectPeriod: 0
            });

            const messageTimeouts = new Map();
            const startTime = Date.now();

            // Общий таймаут операции
            const operationTimeout = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    if (client) client.end();
                    const devicesWithValues = devices.filter(d => d.hasValue);
                    updateStatus(`Timeout - found ${devicesWithValues.length} devices in ${Date.now() - startTime}ms`);
                    resolve(devicesWithValues);
                }
            }, 5000); // Всего 5 секунд на всю операцию

            client.on('connect', () => {
                updateStatus('Connected, subscribing to topics...');

                // Подписываемся на все топики сразу
                const subscriptions = [];
                for (let i = 0; i < maxDevices; i++) {
                    subscriptions.push(`${login}/${i}/devType`);
                    subscriptions.push(`${login}/${i}/lastContact`);
                }

                client.subscribe(subscriptions, (err) => {
                    if (err) {
                        console.error('Subscribe error:', err);
                    } else {
                        updateStatus(`Subscribed to ${subscriptions.length} topics, waiting for messages...`);

                        // Запускаем быстрый таймаут для каждого устройства
                        for (let i = 0; i < maxDevices; i++) {
                            setTimeout(() => {
                                checkDeviceCompletion(i);
                            }, 1000 + (i * 50)); // Постепенная проверка
                        }
                    }
                });
            });

            client.on('message', (topic, message) => {
                const topicParts = topic.split('/');
                const deviceIndex = parseInt(topicParts[1]);

                if (topic.endsWith('/devType')) {
                    const devType = message.toString();
                    let device = getOrCreateDevice(deviceIndex);
                    device.devType = devType;
                    device.hasValue = true;
                    device.devTypeReceived = true;

                } else if (topic.endsWith('/lastContact')) {
                    const lastContact = parseInt(message.toString());
                    const currentTime = Math.floor(Date.now() / 1000);
                    const secondsSinceContact = currentTime - lastContact;

                    let device = getOrCreateDevice(deviceIndex);
                    device.lastContact = lastContact;
                    device.secondsSinceContact = secondsSinceContact;
                    device.lastContactReceived = true;
                }

                // Проверяем завершение для этого устройства
                checkDeviceCompletion(deviceIndex);
            });

            client.on('error', (err) => {
                if (!completed) {
                    completed = true;
                    clearTimeout(operationTimeout);
                    updateStatus('Connection error: ' + err.message);
                    reject(err);
                }
            });

            function getOrCreateDevice(index) {
                let device = devices.find(d => d.index === index);
                if (!device) {
                    device = { index: index };
                    devices.push(device);
                }
                return device;
            }

            function checkDeviceCompletion(deviceIndex) {
                const device = devices.find(d => d.index === deviceIndex);
                if (device && device.devTypeReceived && device.lastContactReceived) {
                    // Устройство полностью обработано
                    if (messageTimeouts.has(deviceIndex)) {
                        clearTimeout(messageTimeouts.get(deviceIndex));
                        messageTimeouts.delete(deviceIndex);
                    }
                }
            }

            // Проверяем завершение всех операций каждые 500ms
            const completionCheckInterval = setInterval(() => {
                const allDevicesProcessed = devices.length > 0 &&
                    devices.every(d => d.devTypeReceived && d.lastContactReceived);

                const processedCount = devices.filter(d => d.devTypeReceived && d.lastContactReceived).length;

                if (allDevicesProcessed || Date.now() - startTime > 4500) {
                    // Завершаем досрочно если все обработано или почти время
                    if (!completed) {
                        completed = true;
                        clearTimeout(operationTimeout);
                        clearInterval(completionCheckInterval);
                        if (client) client.end();

                        const devicesWithValues = devices.filter(d => d.hasValue);
                        const timeSpent = Date.now() - startTime;
                        updateStatus(`Completed in ${timeSpent}ms - found ${devicesWithValues.length} devices`);
                        resolve(devicesWithValues);
                    }
                } else {
                    updateStatus(`Processing... ${processedCount}/${maxDevices} devices (${timeSpent}ms)`);
                }
            }, 500);

        } catch (error) {
            updateStatus('Error: ' + error.message);
            reject(error);
        }
    });
}

function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'Status: ' + message;
    }
    console.log('Status:', message);
}

function formatSeconds(seconds) {
    if (seconds < 0) {
        return "0 секунд";
    }

    if (seconds < 60) {
        return pluralize(seconds, ['секунда', 'секунды', 'секунд']);
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return pluralize(minutes, ['минута', 'минуты', 'минут']);
    }

    const hours = Math.round(seconds / 3600);
    if (hours < 24) {
        return pluralize(hours, ['час', 'часа', 'часов']);
    }

    const days = Math.round(seconds / 86400);
    return pluralize(days, ['день', 'дня', 'дней']);
}

// Функция для правильного склонения слов
function pluralize(number, words) {
    const cases = [2, 0, 1, 1, 1, 2];
    const wordIndex = (number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)];
    return `${number} ${words[wordIndex]}`;
}

function displayResults(devices) {
    const resultsElement = document.querySelector('#device-list tbody');
    if (!resultsElement) return;

    if (devices.length === 0) {
        return;
    }
    let html = '';
    // Сортируем устройства по индексу
    devices.sort((a, b) => a.index - b.index);

    devices.forEach(device => {
        const lastContactDate = device.lastContact ?
            new Date(device.lastContact * 1000).toLocaleString() : 'N/A';
        const secondsAgo = device.secondsSinceContact || 'N/A';

        let onlineIcon = '<span class="status-indicator status-online" title="Устройство онлайн"></span>';
        if (secondsAgo > 600)
            onlineIcon = '<span class="status-indicator status-offline" title="Устройство онлайн"></span>';
        html += `
                    <tr data-href= '/Control/${device.devType}/${device.devType}Control.html' dev-index='${device.index}'}>
                    <td>
                        ${onlineIcon}
                    </td>
                    <td>
                        ${device.index}
                    </td>
                        <td>${device.devType || 'N/A'}</td>
                        <td>${formatSeconds(secondsAgo)} s ago</td>
                    </tr>
                `;
    });

    resultsElement.innerHTML = html;
}

// Функция для запуска сканирования
async function startScan() {
    const serverUrl = 'wss://' + window.location.hostname + ':8084';
    const login = localStorage.getItem('userName');
    const password = localStorage.getItem('jwtToken');


    try {
        // Очищаем предыдущие результаты
        document.querySelector('#device-list tbody').innerHTML = '';
        updateStatus('Starting fast scan...');
        const startTime = Date.now();

        const devices = await scanMQTTDevices(serverUrl, login, password, 7);

        const totalTime = Date.now() - startTime;
        displayResults(devices);

        console.log(`Scan completed in ${totalTime}ms, found ${devices.length} devices`);

    } catch (error) {
        updateStatus('Scan failed: ' + error.message);
        console.error('Scan error:', error);
    }
}

// Инициализация при загрузке страницы
window.onload = function () {
    updateStatus('Ready for fast scanning');

    const table = document.getElementById('device-list');

    table.addEventListener('click', function (event) {
        const row = event.target.closest('tr');
        const index = row.getAttribute('dev-index');
        localStorage.setItem('devIndex', index);
        // Проверяем, что кликнули именно по строке tbody (не заголовку)
        if (row && row.parentNode.nodeName === 'TBODY') {
            const url = row.getAttribute('data-href');
            if (url) {
                window.location.href = url;
            }
        }
    });

};