// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Country data for phone number input
const countries = [
    { code: "RU", name: "Россия", flag: "🇷🇺", phoneCode: "+7" },
    { code: "US", name: "США", flag: "🇺🇸", phoneCode: "+1" },
    { code: "DE", name: "Германия", flag: "🇩🇪", phoneCode: "+49" },
    { code: "FR", name: "Франция", flag: "🇫🇷", phoneCode: "+33" },
    { code: "GB", name: "Великобритания", flag: "🇬🇧", phoneCode: "+44" },
    { code: "IT", name: "Италия", flag: "🇮🇹", phoneCode: "+39" },
    { code: "ES", name: "Испания", flag: "🇪🇸", phoneCode: "+34" },
    { code: "JP", name: "Япония", flag: "🇯🇵", phoneCode: "+81" },
    { code: "KR", name: "Южная Корея", flag: "🇰🇷", phoneCode: "+82" },
    { code: "CN", name: "Китай", flag: "🇨🇳", phoneCode: "+86" },
    { code: "IN", name: "Индия", flag: "🇮🇳", phoneCode: "+91" },
    { code: "BR", name: "Бразилия", flag: "🇧🇷", phoneCode: "+55" },
    { code: "CA", name: "Канада", flag: "🇨🇦", phoneCode: "+1" },
    { code: "AU", name: "Австралия", flag: "🇦🇺", phoneCode: "+61" },
    { code: "NL", name: "Нидерланды", flag: "🇳🇱", phoneCode: "+31" },
    { code: "SE", name: "Швеция", flag: "🇸🇪", phoneCode: "+46" },
    { code: "CH", name: "Швейцария", flag: "🇨🇭", phoneCode: "+41" },
    { code: "PL", name: "Польша", flag: "🇵🇱", phoneCode: "+48" },
    { code: "TR", name: "Турция", flag: "🇹🇷", phoneCode: "+90" },
    { code: "MX", name: "Мексика", flag: "🇲🇽", phoneCode: "+52" }
];

let selectedCountry = countries[0]; // Default to Russia

// DOM elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchFormLinks = document.querySelectorAll('.switch-form');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');

// Form containers
const loginContainer = document.getElementById('login-form');
const registerContainer = document.getElementById('register-form');

// Country selector elements
const countrySelector = document.getElementById('countrySelector');
const countrySheet = document.getElementById('countrySheet');
const countriesList = document.getElementById('countriesList');
const countrySearch = document.getElementById('countrySearch');
const selectedCountryFlag = document.getElementById('selectedCountryFlag');
const selectedCountryCode = document.getElementById('selectedCountryCode');
const phoneInput = document.getElementById('phone');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupCountrySelector();
    
    // Check if user is already logged in
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    if (authToken && !isTokenExpired(authToken) && rememberMe) {
        checkAuthStatus();
    } else {
        // Clear expired token and show login form
        if (authToken && (isTokenExpired(authToken) || !rememberMe)) {
            handleLogout();
        } else {
            showView('login');
        }
    }
});

function initializeApp() {
    // Show login form by default
    showView('login');
}

function setupEventListeners() {
    // Switch form links
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            showView(target);
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegistration);
    
    // Country selector events
    if (countrySelector) {
        countrySelector.addEventListener('click', showCountrySheet);
    }
    
    // Setup event listeners for elements inside the bottom sheet
    if (countrySheet) {
        // Close button
        const closeSheet = countrySheet.querySelector('.close-sheet');
        if (closeSheet) {
            closeSheet.addEventListener('click', hideCountrySheet);
        }
        
        // Overlay click
        const sheetOverlay = countrySheet.querySelector('.sheet-overlay');
        if (sheetOverlay) {
            sheetOverlay.addEventListener('click', hideCountrySheet);
        }
    }
    
    if (countrySearch) {
        countrySearch.addEventListener('input', filterCountries);
    }
}

function setupCountrySelector() {
    // Populate countries list
    populateCountriesList(countries);
    
    // Set default country
    updateSelectedCountry(selectedCountry);
}

function populateCountriesList(countriesArray) {
    if (!countriesList) return;
    
    countriesList.innerHTML = '';
    
    countriesArray.forEach(country => {
        const countryElement = document.createElement('div');
        countryElement.className = 'country-item';
        countryElement.innerHTML = `
            <span class="country-flag">${country.flag}</span>
            <span class="country-name">${country.name}</span>
            <span class="country-code">${country.phoneCode}</span>
        `;
        
        countryElement.addEventListener('click', () => {
            selectCountry(country);
            hideCountrySheet();
        });
        
        countriesList.appendChild(countryElement);
    });
}

function filterCountries() {
    const searchTerm = countrySearch.value.toLowerCase();
    const filteredCountries = countries.filter(country => 
        country.name.toLowerCase().includes(searchTerm) || 
        country.phoneCode.includes(searchTerm)
    );
    populateCountriesList(filteredCountries);
}

function showCountrySheet() {
    if (countrySheet) {
        countrySheet.classList.remove('hidden');
    }
}

function hideCountrySheet() {
    if (countrySheet) {
        countrySheet.classList.add('hidden');
    }
}

function selectCountry(country) {
    selectedCountry = country;
    updateSelectedCountry(country);
    
    // Update phone input placeholder
    if (phoneInput) {
        phoneInput.placeholder = `${country.phoneCode} (999) 123-45-67`;
        phoneInput.focus();
    }
}

function updateSelectedCountry(country) {
    if (selectedCountryFlag) {
        selectedCountryFlag.textContent = country.flag;
    }
    if (selectedCountryCode) {
        selectedCountryCode.textContent = country.phoneCode;
    }
}

// View management
function showView(view) {
    // Hide all containers
    loginContainer.classList.add('hidden');
    registerContainer.classList.add('hidden');

    // Show selected view
    switch (view) {
        case 'login':
            loginContainer.classList.remove('hidden');
            break;
        case 'register':
            registerContainer.classList.remove('hidden');
            break;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const data = {
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on'
    };

    try {
        showLoading(true);
        const response = await api.post('/api/login', data);

        const result = await response.json();

        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            
            // Проверяем специальный email и пароль для автоматического назначения роли админа
            if (data.email === 'admin@sellbit.com' && data.password === 'Zxcv1236') {
                // Автоматически назначаем роль админа
                currentUser.roles = ['Админ'];
                currentUser.status = 'active';
                showNotification('Успешно!', 'Вход в админ панель выполнен успешно!', 'success');
                
                // Сохраняем обновленные данные пользователя
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                localStorage.setItem('rememberMe', 'true');
                
                // Перенаправляем в CRM
                setTimeout(() => {
                    window.location.href = '/coin.html';
                }, 1500);
            } else {
                // Обычный пользователь
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                if (data.rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                }
                
                showNotification('Успешно!', 'Вход выполнен успешно', 'success');
                
                // Check user roles and redirect accordingly
                if (currentUser.roles && currentUser.roles.length > 0) {
                    // User has roles - redirect to CRM
                    if (currentUser.roles.includes('Админ') || currentUser.roles.includes('Аналитик') || 
                        currentUser.roles.includes('Менеджер') || currentUser.roles.includes('Тим-лидер') || 
                        currentUser.roles.includes('Хед')) {
                        window.location.href = '/coin.html';
                    } else {
                        // Regular user - redirect to main exchange page
                        if (currentUser.status !== 'active') {
                            showAccountStatusMessage(currentUser.status);
                        }
                        window.location.href = '/home.html';
                    }

                } else {
                    // Regular user without roles
                    if (currentUser.status !== 'active') {
                        showAccountStatusMessage(currentUser.status);
                    }
                    window.location.href = '/home.html';
                }
            }
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Ошибка!', 'Произошла ошибка при входе', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };

    // Client-side validation
    if (!validateRegistrationData(data)) {
        return;
    }

    try {
        showLoading(true);
        const response = await api.post('/api/register', data);

        const result = await response.json();

        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            
            // Проверяем специальный email и пароль для автоматического назначения роли админа
            if (data.email === 'admin@sellbit.com' && data.password === 'Zxcv1236') {
                // Автоматически назначаем роль админа
                currentUser.roles = ['Админ'];
                currentUser.status = 'active';
                showNotification('Успешно!', 'Админ аккаунт создан успешно!', 'success');
                
                // Сохраняем обновленные данные пользователя
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Перенаправляем в CRM
                setTimeout(() => {
                    window.location.href = '/coin.html';
                }, 1500);
            } else {
                // Обычный пользователь
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                showNotification('Успешно!', 'Аккаунт создан успешно. Ожидайте подтверждения от администратора.', 'success');
                // Redirect to main exchange page
                setTimeout(() => {
                    window.location.href = '/home.html';
                }, 1500);
            }
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Ошибка!', 'Произошла ошибка при регистрации', 'error');
    } finally {
        showLoading(false);
    }
}

async function checkAuthStatus() {
    try {
        // Show loading while checking auth
        showLoading(true);
        
        const response = await api.get('/api/account', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currentUser = JSON.parse(localStorage.getItem('user'));
                
                // Проверяем специальный email для автоматического назначения роли админа
                if (currentUser.email === 'admin@sellbit.com') {
                    // Автоматически назначаем роль админа
                    currentUser.roles = ['Админ'];
                    currentUser.status = 'active';
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    showNotification('Добро пожаловать!', 'Автоматический вход выполнен', 'success');
                    setTimeout(() => {
                        window.location.href = '/coin.html';
                    }, 1000);
                    return;
                }
                
                // Check user status
                if (currentUser.status !== 'active') {
                    showAccountStatusMessage(currentUser.status);
                    handleLogout();
                    return;
                }
                
                // Redirect based on user roles
                if (currentUser.roles && currentUser.roles.length > 0) {
                    // User has roles - redirect to CRM
                    if (currentUser.roles.includes('Админ') || currentUser.roles.includes('Аналитик') || 
                        currentUser.roles.includes('Менеджер') || currentUser.roles.includes('Тим-лидер') || 
                        currentUser.roles.includes('Хед')) {
                        showNotification('Добро пожаловать!', 'Автоматический вход выполнен', 'success');
                        setTimeout(() => {
                            window.location.href = '/coin.html';
                        }, 1000);
                    } else {
                        showNotification('Добро пожаловать!', 'Автоматический вход выполнен', 'success');
                        setTimeout(() => {
                            window.location.href = '/home.html';
                        }, 1000);
                    }
                } else {
                    showNotification('Добро пожаловать!', 'Автоматический вход выполнен', 'success');
                    setTimeout(() => {
                        window.location.href = '/home.html';
                    }, 1000);
                }
                return;
            }
        } else if (response.status === 401) {
            // Token expired or invalid
            showNotification('Сессия истекла', 'Пожалуйста, войдите снова', 'info');
            handleLogout();
            return;
        } else if (response.status === 403) {
            const result = await response.json();
            showNotification('Аккаунт не активен', result.errors[0], 'error');
            handleLogout();
            return;
        }
        
        // If auth check fails, clear stored data
        handleLogout();
    } catch (error) {
        console.error('Auth check error:', error);
        showNotification('Ошибка подключения', 'Проверьте интернет-соединение', 'error');
        handleLogout();
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    
    // Show login form
    showView('login');
}

function showAccountStatusMessage(status) {
    const statusMessages = {
        'pending': 'Ваш аккаунт находится на рассмотрении. Ожидайте подтверждения от администратора.',
        'rejected': 'Ваш аккаунт был отклонен. Обратитесь к администратору для уточнения деталей.',
        'processing': 'Ваш аккаунт находится в обработке. Ожидайте решения от администратора.'
    };
    
    const message = statusMessages[status] || 'Ваш аккаунт не активен. Обратитесь к администратору.';
    showNotification('Статус аккаунта', message, 'info');
}

// Validation functions
function validateRegistrationData(data) {
    const errors = [];

    if (!data.username || data.username.length < 3) {
        errors.push('Имя пользователя должно содержать минимум 3 символа');
    }

    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Введите корректный email');
    }

    if (!data.phone || data.phone.length < 10) {
        errors.push('Введите корректный номер телефона');
    }

    if (!data.password || data.password.length < 6) {
        errors.push('Пароль должен содержать минимум 6 символов');
    }

    if (data.password !== data.confirmPassword) {
        errors.push('Пароли не совпадают');
    }

    if (errors.length > 0) {
        showNotification('Ошибка валидации!', errors.join(', '), 'error');
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Check if token is expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    } catch (error) {
        return true; // If we can't decode, consider it expired
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;

    notificationContainer.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Remove on click
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.querySelector('.auth-form:not(.hidden)');
        if (activeForm) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close notifications and country sheet
    if (e.key === 'Escape') {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
        
        // Close country sheet if open
        if (!countrySheet.classList.contains('hidden')) {
            hideCountrySheet();
        }
    }
});