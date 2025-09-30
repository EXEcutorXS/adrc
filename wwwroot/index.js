class AuthApp {
    constructor() {
        this.baseUrl = 'http://localhost:5212/api'; // Замените на ваш URL
        this.token = localStorage.getItem('jwtToken');

        this.initializeEventListeners();
        this.checkAuthState();
    }

    initializeEventListeners() {
        // Переключение табов
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Формы
        document.getElementById('login-form').addEventListener('submit', (e) => this.login(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.register(e));
        document.getElementById('update-profile-form').addEventListener('submit', (e) => this.updateProfile(e));

        // Выход
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
    }

    switchTab(tabName) {
        // Обновляем активные табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Показываем соответствующий раздел
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.toggle('active', section.id === `${tabName}-section`);
        });

        // Если переключились на профиль и авторизованы - загружаем данные
        if (tabName === 'profile' && this.token) {
            this.loadUserProfile();
        }
    }

    showMessage(message, type = 'success') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');

        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }

    async makeRequest(url, options = {}) {

        const config = {
            ...options,  // сначала options
            headers: {   // затем headers (перезаписывает headers из options)
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors ? Object.values(data.errors).flat().join(', ') : data.message || 'Ошибка запроса');
        }
        return { success: true, data };
    } catch(error) {
        return { success: false, error: error.message };
    }


    async login(e) {
        e.preventDefault();

        const login = document.getElementById('login-login').value;
        const password = document.getElementById('login-password').value;

        const result = await this.makeRequest(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ login, password })
        });

        if (result.success) {
            this.token = result.data.token;
            localStorage.setItem('jwtToken', this.token);
            this.showMessage('Successful login!');
            this.checkAuthState();
            this.switchTab('profile');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    async register(e) {
        e.preventDefault();

        try {
            const formData = {
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value,
                useFarenheit: document.getElementById('temperature-format').value == "true",
                use12HourFormat: document.getElementById('time-format').value == "true",
                timeZone: document.getElementById('register-timezone').value,
                language: document.getElementById('register-language').value
            };

            const hasNumber = /\d/.test(formData.password);
            const hasUpperCase = /[A-Z]/.test(formData.password);

            if (!hasNumber || !hasUpperCase) {
                this.showMessage('Password must contain digits and uppercase!');
                return;
            }

            const result = await this.makeRequest(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (result.success) {
                this.token = result.data.token;
                localStorage.setItem('jwtToken', this.token);
                this.showMessage('Sucessful registration!');
                this.checkAuthState();
                this.switchTab('profile');
            } else {
                this.showMessage(result.error, 'error');
            }
        }
        catch (error) {
            this.showMessage('Registration failed ' + error);
        }
    }

    async loadUserProfile() {
        const result = await this.makeRequest(`${this.baseUrl}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (result.success) {
            const user = result.data;
            document.getElementById('user-username').textContent = user.email;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-temperature').textContent =
                user.useFarenheit == false ? 'Celsius (°C)' : 'Farenheit (°F)';
            document.getElementById('user-time').textContent =
                user.user12HourFormat == false ? '24 hour format' : '12 hour format';
            document.getElementById('user-timezone').textContent = user.timeZone;
            document.getElementById('user-language').textContent = user.language;

            // Заполняем форму обновления
            document.getElementById('update-temperature').value = user.temperatureFormat;
            document.getElementById('update-time').value = user.timeFormat;
            document.getElementById('update-timezone').value = user.timeZone;
            document.getElementById('update-language').value = user.language;

            document.getElementById('user-info').classList.remove('hidden');
        }
    }

    async updateProfile(e) {
        e.preventDefault();

        const formData = {
            temperatureFormat: document.getElementById('update-temperature').value,
            timeFormat: document.getElementById('update-time').value,
            timeZone: document.getElementById('update-timezone').value,
            languge: document.getElementById('update-language').value
        };

        try {

            const response = await this.makeRequest(`${this.baseUrl}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(formData)
            });


            console.log('Status Text:', response.data);

            if (!response.success) {
                this.showMessage(`HTTP error! status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.showMessage('Progile update successfully');

        } catch (error) {
            console.error('Error:', error);
        }

    }


    logout() {
        this.token = null;
        localStorage.removeItem('jwtToken');
        this.checkAuthState();
        this.showMessage('You logged out');
        this.switchTab('login');
    }

    checkAuthState() {

        if (this.token) {
            // Показываем все табы для авторизованных пользователей
            document.querySelectorAll('.tab').forEach(tab => {
                tab.style.display = 'flex';
            });
        } else {

            // Скрываем табу профиля для неавторизованных
            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.dataset.tab === 'profile') {
                    tab.style.display = 'none';
                } else {
                    tab.style.display = 'flex';
                }
            });
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new AuthApp();
});