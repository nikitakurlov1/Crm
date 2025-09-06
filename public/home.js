// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Инициализация главной страницы...');
    
    // Проверяем авторизацию
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.log('Нет токена авторизации, перенаправляем на логин');
        window.location.href = '/index.html';
        return;
    }

    try {
        // Декодируем JWT токен
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        console.log('JWT payload:', payload);

        // Сначала устанавливаем состояние загрузки
        setLoadingState();

        // Загружаем данные пользователя
        const user = JSON.parse(localStorage.getItem('user')) || {
            id: payload.userId,
            username: payload.username,
            balance: 0
        };

        // Если есть токен авторизации, загружаем актуальный баланс из базы данных
        try {
            const response = await api.get(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();
            if (result.success) {
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
                console.log(`Баланс загружен из БД: $${user.balance}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки баланса при инициализации:', error);
        }

        // Инициализируем интерфейс последовательно с правильной синхронизацией
        initializeBalanceToggle();
        await loadBalanceAndStats();
        await loadAssets();
        await loadRecentTransactions();
        
        // Инициализируем состояние секций
        initializeSections();
        
        // Автоматическое обновление баланса каждые 10 секунд
        setInterval(async () => {
            await loadBalanceAndStats();
        }, 10000);
        
        console.log('Главная страница инициализирована');
        
        // Listen for balance updates from spot trading
        window.addEventListener('storage', function(e) {
            if (e.key === 'balanceUpdate') {
                console.log('Balance update detected from spot trading');
                loadBalanceAndStats();
            }
        });
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        // Если есть ошибка с токеном, перенаправляем на логин
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    }
});

// Безопасное форматирование процентов с ограничением диапазона
function formatSignedPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
        return '+0.00%';
    }
    const clamped = Math.max(-999.99, Math.min(999.99, numeric));
    const sign = clamped >= 0 ? '+' : '';
    return `${sign}${clamped.toFixed(2)}%`;
}

// Безопасное форматирование чисел
function formatNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
        return '0';
    }
    return numeric.toString();
}

async function initializeApp() {
    // Получаем пользователя из localStorage или устанавливаем по умолчанию
    let user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('currentUser'));
    const authToken = localStorage.getItem('authToken');
    
    if (!user) {
        // Если нет пользователя, попробуем получить из JWT токена
        if (authToken) {
            try {
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                user = {
                    id: payload.userId,
                    name: 'Пользователь',
                    email: payload.email,
                    balance: 0
                };
                localStorage.setItem('user', JSON.stringify(user));
            } catch (error) {
                console.error('Ошибка декодирования JWT токена:', error);
                user = {
                    id: 1,
                    name: 'Пользователь',
                    email: 'user@example.com',
                    balance: 0
                };
            }
        } else {
            user = {
                id: 1,
                name: 'Пользователь',
                email: 'user@example.com',
                balance: 0
            };
        }
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Если есть токен авторизации, загружаем актуальный баланс из базы данных
    if (authToken && user.id) {
        try {
            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await api.get(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();
            if (result.success) {
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
                console.log(`Баланс загружен из БД: $${user.balance}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки баланса при инициализации:', error);
        }
    }
    
    // Инициализируем статистику пользователя
    const defaultStats = {
        monthlyChange: 0,
        assetsCount: 0,
        activeStakes: 0
    };
    
    localStorage.setItem('userStats', JSON.stringify(defaultStats));
    updateUserAvatar();
}

function updateUserAvatar() {
    const user = JSON.parse(localStorage.getItem('user'));
    const avatar = document.getElementById('userAvatar');
    if (user && avatar) {
        avatar.textContent = user.name.charAt(0).toUpperCase();
    }
}

function initializeBalanceToggle() {
    const eyeBtn = document.querySelector('.eye-btn');
    if (eyeBtn) {
        // Устанавливаем начальное состояние иконки
        updateEyeIcon();
        
        // Добавляем обработчик клика
        eyeBtn.addEventListener('click', toggleBalanceVisibility);
    }
}

function toggleBalanceVisibility() {
    const isCurrentlyHidden = localStorage.getItem('balanceHidden') === 'true';
    const newState = !isCurrentlyHidden;
    
    // Сохраняем новое состояние
    localStorage.setItem('balanceHidden', newState.toString());
    
    // Обновляем иконку
    updateEyeIcon();
    
    // Перезагружаем баланс с новым состоянием
    loadBalance();
}

function updateEyeIcon() {
    const eyeBtn = document.querySelector('.eye-btn i');
    const isHidden = localStorage.getItem('balanceHidden') === 'true';
    
    if (eyeBtn) {
        if (isHidden) {
            eyeBtn.className = 'fas fa-eye-slash';
        } else {
            eyeBtn.className = 'fas fa-eye';
        }
    }
}

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.dataset.page;
            navigateToPage(page);
        });
    });
}

async function loadDashboardData() {
    await loadBalance();
    loadRecentTransactions();
    loadActiveStakes();
    updateStats();
}

// Функция состояния загрузки
function setLoadingState() {
    const balanceElement = document.getElementById('totalBalance');
    const monthlyTransactionsElement = document.getElementById('monthlyTransactions');
    const assetsCountElement = document.getElementById('assetsCount');
    const activeStakesElement = document.getElementById('activeStakes');

    if (balanceElement) {
        balanceElement.textContent = 'Загрузка...';
    }
    if (monthlyTransactionsElement) {
        monthlyTransactionsElement.textContent = 'Загрузка...';
    }
    if (assetsCountElement) {
        assetsCountElement.textContent = 'Загрузка...';
    }
    if (activeStakesElement) {
        activeStakesElement.textContent = 'Загрузка...';
    }
}

// Объединенная функция для загрузки баланса и статистики
async function loadBalanceAndStats() {
    const user = JSON.parse(localStorage.getItem('user'));
    const authToken = localStorage.getItem('authToken');
    
    if (!user || !authToken) {
        return;
    }

    try {
        // Получаем актуальный баланс из базы данных
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const response = await fetch(`/api/users/${payload.userId}/balance`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Обновляем баланс в localStorage
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
    
    // Check for spot trading balance updates
    const spotBalance = JSON.parse(localStorage.getItem('spotBalance')) || {};
    if (spotBalance.USDT !== undefined) {
        // Update main balance with spot USDT balance
        user.balance = spotBalance.USDT;
        localStorage.setItem('user', JSON.stringify(user));
        console.log('Updated balance from spot trading:', user.balance);
    }

    // Синхронно обновляем отображение баланса и статистики
    updateBalanceDisplay(user);
    updateStatsDisplay();
}

// Отдельная функция для обновления отображения баланса
function updateBalanceDisplay(user) {
    const balance = user ? user.balance : 0;
    const balanceElement = document.getElementById('totalBalance');
    const hideBalance = localStorage.getItem('hideBalance') === 'true';
    
    if (balanceElement) {
        if (hideBalance) {
            balanceElement.textContent = '***';
        } else {
            // Используем фиксированное форматирование с всегда 2 десятичными знаками
            balanceElement.textContent = `$${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
        }
    }
    
    // Инициализируем/обновляем снэпшот для расчета изменения за месяц
    ensureMonthlySnapshot(balance);
}

// Устаревшая функция для обратной совместимости
async function loadBalance() {
    await loadBalanceAndStats();
}








function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    // Загружаем все типы транзакций из localStorage
    const allTransactions = [];
    
    // Покупки
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    purchases.forEach(purchase => {
        allTransactions.push({
            id: `buy_${purchase.id}`,
            type: 'buy',
            title: `Покупка ${purchase.coinName}`,
            amount: -purchase.amount,
            currency: purchase.currency,
            date: purchase.date || new Date().toISOString(),
            status: 'completed',
            details: `${purchase.coinAmount} ${purchase.coinSymbol}`,
            icon: 'fas fa-arrow-up'
        });
    });

    // Продажи
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    sales.forEach(sale => {
        allTransactions.push({
            id: `sell_${sale.id}`,
            type: 'sell',
            title: `Продажа ${sale.coinName}`,
            amount: sale.amount,
            currency: sale.currency,
            date: sale.date || new Date().toISOString(),
            status: 'completed',
            details: `${sale.coinAmount} ${sale.coinSymbol}`,
            icon: 'fas fa-arrow-down'
        });
    });

    // Активные ставки
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
    activeStakes.forEach(stake => {
        allTransactions.push({
            id: `stake_active_${stake.id}`,
            type: 'stake',
            title: `Сделка ${stake.coinName}`,
            amount: -stake.amount,
            currency: 'USD',
            date: stake.startTime,
            status: 'pending',
            details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • x${stake.winMultiplier}`,
            icon: 'fas fa-chart-line',
            profit: 0,
            isActive: true
        });
    });
    
    // Spot trading orders
    const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory')) || [];
    spotOrderHistory.forEach(order => {
        allTransactions.push({
            id: `spot_${order.id}`,
            type: order.side, // 'buy' or 'sell'
            title: `${order.side === 'buy' ? 'Покупка' : 'Продажа'} ${order.baseAsset}`,
            amount: order.side === 'buy' ? -order.total : order.total,
            currency: order.quoteAsset,
            date: order.timestamp,
            status: 'completed',
            details: `${order.amount.toFixed(8)} ${order.baseAsset} • $${order.price.toFixed(2)}`,
            icon: order.side === 'buy' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'
        });
    });

    // Завершенные ставки из истории
    const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
    stakeHistory.forEach(stake => {
        allTransactions.push({
            id: `stake_completed_${stake.id}`,
            type: 'stake',
            title: `Сделка ${stake.coinName}`,
            amount: stake.result === 'win' ? stake.winAmount : -stake.amount,
            currency: 'USD',
            date: stake.startTime,
            status: 'completed',
            details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • ${stake.result === 'win' ? 'Победа' : 'Проигрыш'}`,
            icon: 'fas fa-chart-line',
            profit: stake.profit || 0,
            isActive: false,
            result: stake.result,
            winAmount: stake.winAmount
        });
    });

    // Пополнения
    const deposits = JSON.parse(localStorage.getItem('deposits')) || [];
    deposits.forEach(deposit => {
        allTransactions.push({
            id: `deposit_${deposit.id}`,
            type: 'deposit',
            title: 'Пополнение',
            amount: deposit.amount,
            currency: 'USD',
            date: deposit.date || new Date().toISOString(),
            status: 'completed',
            details: 'Пополнение баланса',
            icon: 'fas fa-plus'
        });
    });

    // Выводы
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    withdrawals.forEach(withdrawal => {
        allTransactions.push({
            id: `withdraw_${withdrawal.id}`,
            type: 'withdraw',
            title: 'Вывод',
            amount: -withdrawal.amount,
            currency: 'USD',
            date: withdrawal.date || new Date().toISOString(),
            status: 'completed',
            details: 'Вывод средств',
            icon: 'fas fa-minus'
        });
    });

    // Сортируем по дате (новые сначала) и берем последние 10
    const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <div class="transactions-empty">
                <i class="fas fa-receipt"></i>
                <p>Нет операций</p>
                <button class="text-btn" onclick="window.location.href='coins.html'">
                    Начать торговлю
                </button>
            </div>
        `;
    } else {
        container.innerHTML = recentTransactions.map(tx => {
            const transactionInfo = getTransactionInfo(tx);
            const sign = transactionInfo.isPositive ? '+' : (tx.amount < 0 ? '-' : '');
            const formattedAmount = tx.currency === 'USD' 
                ? `$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${Math.abs(tx.amount).toFixed(8)} ${tx.currency}`;
            
            return `
                <div class="transaction-item ${transactionInfo.color}" onclick="openTransactionDetails('${tx.type}', '${tx.amount}', '${tx.currency}')">
                    <div class="transaction-icon ${transactionInfo.color}">${getTransactionIconSVG(transactionInfo, tx)}</div>
                    <div class="transaction-info">
                        <div class="transaction-details">
                            <div class="transaction-type">${transactionInfo.typeText}</div>
                            <div class="transaction-date">${formatDate(tx.date)}</div>
                        </div>
                    </div>
                    <div class="transaction-amount ${transactionInfo.color}">
                        ${sign}${formattedAmount}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function getTransactionInfo(transaction) {
    switch (transaction.type) {
        case 'buy':
            return {
                typeText: `Покупка ${transaction.title.split(' ').pop()}`,
                icon: 'fa-arrow-up',
                color: 'negative',
                isPositive: false
            };
        case 'sell':
            return {
                typeText: `Продажа ${transaction.title.split(' ').pop()}`,
                icon: 'fa-arrow-down',
                color: 'positive',
                isPositive: true
            };
        case 'stake':
            if (transaction.isActive) {
                return {
                    typeText: `Сделка ${transaction.title.split(' ').pop()}`,
                    icon: 'fa-chart-line',
                    color: 'neutral',
                    isPositive: false
                };
            } else {
                return {
                    typeText: transaction.result === 'win' ? `Победа в сделке` : `Проигрыш в сделке`,
                    icon: transaction.result === 'win' ? 'fa-trophy' : 'fa-times',
                    color: transaction.result === 'win' ? 'positive' : 'negative',
                    isPositive: transaction.result === 'win'
                };
            }
        case 'deposit':
            return {
                typeText: 'Пополнение',
                icon: 'fa-plus',
                color: 'positive',
                isPositive: true
            };
        case 'withdraw':
            return {
                typeText: 'Вывод',
                icon: 'fa-minus',
                color: 'negative',
                isPositive: false
            };
        default:
            return {
                typeText: transaction.title || 'Операция',
                icon: 'fa-exchange-alt',
                color: 'neutral',
                isPositive: transaction.amount >= 0
            };
    }
}

// Modern inline SVG icons for transactions
function getTransactionIconSVG(info, transaction) {
    const common = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    if (transaction.type === 'stake' && transaction.isActive) {
        // Chart line icon
        return `<svg ${common}>
            <polyline points="3 17 9 11 13 15 21 7"></polyline>
            <polyline points="14 7 21 7 21 14"></polyline>
        </svg>`;
    }

    if (transaction.type === 'stake' && transaction.result === 'win') {
        // Trophy/check icon
        return `<svg ${common}>
            <path d="M8 21h8"></path>
            <path d="M12 17c3 0 4-2 4-4V5H8v8c0 2 1 4 4 4z"></path>
            <path d="M18 5h3a3 3 0 0 1-3 3"></path>
            <path d="M6 5H3a3 3 0 0 0 3 3"></path>
        </svg>`;
    }

    if (transaction.type === 'stake' && transaction.result === 'loss') {
        // Cross in circle
        return `<svg ${common}>
            <circle cx="12" cy="12" r="9"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`;
    }

    if (transaction.type === 'deposit') {
        return `<svg ${common}>
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
        </svg>`;
    }

    if (transaction.type === 'withdraw') {
        return `<svg ${common}>
            <path d="M5 12h14"></path>
        </svg>`;
    }

    // Fallback arrow icon
    return `<svg ${common}>
        <polyline points="7 17 12 12 17 17"></polyline>
        <line x1="12" y1="12" x2="12" y2="3"></line>
    </svg>`;
}

// Обновленная функция для синхронного обновления статистики
function updateStatsDisplay() {
    // Получаем данные пользователя
    const user = JSON.parse(localStorage.getItem('user'));
    const userBalance = user ? user.balance : 0;
    
    // Подсчитываем активные ставки
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
    const activeStakesCount = activeStakes.filter(stake => stake.status === 'active').length;
    
    // Подсчитываем количество активов (покупки - продажи + spot trading assets)
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    let assetsCount = purchases.length - sales.length;
    
    // Add spot trading assets
    const spotBalance = JSON.parse(localStorage.getItem('spotBalance')) || {};
    const spotAssets = Object.keys(spotBalance).filter(asset => 
        asset !== 'USDT' && spotBalance[asset] > 0
    ).length;
    assetsCount += spotAssets;
    
    // Рассчитываем количество сделок за месяц
    const monthlyTransactions = calculateMonthlyTransactions();
    
    // Обновляем отображение статистики единовременно
    const monthlyTransactionsElement = document.getElementById('monthlyTransactions');
    const assetsCountElement = document.getElementById('assetsCount');
    const activeStakesElement = document.getElementById('activeStakes');

    if (monthlyTransactionsElement) {
        monthlyTransactionsElement.textContent = formatNumber(monthlyTransactions);
    }
    if (assetsCountElement) {
        assetsCountElement.textContent = formatNumber(Math.max(0, assetsCount));
    }
    if (activeStakesElement) {
        activeStakesElement.textContent = formatNumber(activeStakesCount);
    }
}

// Функция для подсчета сделок за месяц
function calculateMonthlyTransactions() {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    let monthlyCount = 0;
    
    // Считаем покупки за месяц
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    monthlyCount += purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date || purchase.timestamp);
        return purchaseDate >= oneMonthAgo;
    }).length;
    
    // Считаем продажи за месяц
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    monthlyCount += sales.filter(sale => {
        const saleDate = new Date(sale.date || sale.timestamp);
        return saleDate >= oneMonthAgo;
    }).length;
    
    // Считаем ставки за месяц (активные + завершенные)
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
    monthlyCount += activeStakes.filter(stake => {
        const stakeDate = new Date(stake.startTime || stake.date);
        return stakeDate >= oneMonthAgo;
    }).length;
    
    const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
    monthlyCount += stakeHistory.filter(stake => {
        const stakeDate = new Date(stake.startTime || stake.date);
        return stakeDate >= oneMonthAgo;
    }).length;
    
    // Считаем депозиты за месяц
    const deposits = JSON.parse(localStorage.getItem('deposits')) || [];
    monthlyCount += deposits.filter(deposit => {
        const depositDate = new Date(deposit.date || deposit.timestamp);
        return depositDate >= oneMonthAgo;
    }).length;
    
    // Считаем выводы за месяц
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    monthlyCount += withdrawals.filter(withdrawal => {
        const withdrawalDate = new Date(withdrawal.date || withdrawal.timestamp);
        return withdrawalDate >= oneMonthAgo;
    }).length;
    
    // Считаем spot trading сделки за месяц
    const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory')) || [];
    monthlyCount += spotOrderHistory.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= oneMonthAgo;
    }).length;
    
    return monthlyCount;
}

// Global function to update home balance from other pages
window.updateHomeBalance = function() {
    loadBalanceAndStats();
};

// Global function to refresh home data
window.refreshHomeData = function() {
    loadBalanceAndStats();
    loadRecentTransactions();
};

// Устаревшая функция для обратной совместимости
function updateStats() {
    updateStatsDisplay();
}

function loadActiveStakes() {
    const savedStakes = localStorage.getItem('activeStakes');
    const activeStakes = savedStakes ? JSON.parse(savedStakes).filter(stake => stake.status === 'active') : [];
    
    // Обновляем счетчик активных ставок
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {
        monthlyChange: 2.92,
        assetsCount: 5,
        activeStakes: 0
    };
    userStats.activeStakes = activeStakes.length;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    
    // Обновляем отображение в статистике
    const activeStakesElement = document.getElementById('activeStakes');
    if (activeStakesElement) {
        activeStakesElement.textContent = activeStakes.length;
    }
    
    // Если есть активные ставки, показываем их в отдельной секции
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Удаляем существующую секцию активных ставок, если она есть
    const existingStakesSection = document.querySelector('.active-stakes-section');
    if (existingStakesSection) {
        existingStakesSection.remove();
    }
    
    if (activeStakes.length > 0) {
        // Создаем секцию активных ставок
        const stakesSection = document.createElement('section');
        stakesSection.className = 'active-stakes-section';
        stakesSection.innerHTML = `
            <div class="section-header">
                <h2>Активные ставки</h2>
                <span class="stakes-count">${activeStakes.length}</span>
            </div>
            <div class="stakes-list">
                ${activeStakes.map(stake => {
                    const timeLeft = new Date(stake.endTime) - new Date();
                    const minutes = Math.floor(timeLeft / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    
                    return `
                        <div class="stake-item" data-stake-id="${stake.id}">
                            <div class="stake-info">
                                <div class="stake-coin">${stake.coinName} (${stake.coinSymbol})</div>
                                <div class="stake-details">
                                    $${stake.amount.toFixed(2)} • ${getPeriodText(stake.period)}
                                </div>
                            </div>
                            <div class="stake-timer">
                                <div class="timer-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                                <div class="timer-label">Осталось</div>
                            </div>
                            <div class="stake-direction ${stake.direction}">
                                <i class="fas fa-arrow-${stake.direction === 'up' ? 'up' : 'down'}"></i>
                                <span>${stake.direction === 'up' ? 'Рост' : 'Падение'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Вставляем секцию после секции статистики
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.parentNode.insertBefore(stakesSection, statsSection.nextSibling);
        }
        
        // Запускаем таймеры для обновления времени
        startStakesTimers(activeStakes);
    }
}



function startStakesTimers(stakes) {
    stakes.forEach(stake => {
        const timerId = setInterval(() => {
            const timeLeft = new Date(stake.endTime) - new Date();
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                // Ставка завершена, обновляем отображение
                loadActiveStakes();
            } else {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                const timerElement = document.querySelector(`[data-stake-id="${stake.id}"] .timer-value`);
                if (timerElement) {
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    });
}

function getPeriodText(minutes) {
    if (minutes < 60) {
        return `${minutes} мин`;
    } else if (minutes < 1440) {
        const hours = minutes / 60;
        return `${hours} ч`;
    } else {
        const days = minutes / 1440;
        return `${days} дн`;
    }
}


function openDepositModal() {
    window.location.href = 'Dep.html';
}

function openWithdrawModal() {
    window.location.href = 'vivod.html';
}

function openSupportModal() {
    window.location.href = 'support.html';
}

function contactSupport(type) {
    switch(type) {
        case 'email':
            window.open('mailto:support@sellbit.com?subject=Техническая поддержка', '_blank');
            break;
        case 'telegram':
            window.open('https://t.me/SaleBitAdmin', '_blank');
            break;
        case 'chat':
            showToast('Онлайн чат', 'Чат будет открыт в новом окне', 'info');
            // Здесь можно добавить интеграцию с чат-системой
            break;
    }
    closeModal('supportModal');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function navigateToPage(page) {
    if (page === 'home') {
        window.location.href = 'home.html';
    } else if (page === 'coins') {
        window.location.href = 'coins.html';
    } else if (page === 'news') {
        window.location.href = 'news.html';
    } else if (page === 'settings') {
        window.location.href = 'settings.html';
    } else if (page === 'history') {
        window.location.href = 'History.html';
    }
}

function formatCurrency(amount) {
    if (amount >= 1000) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (amount >= 1) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

function openTransactionDetails(type, amount, currency) {
    const typeText = type === 'deposit' ? 'Пополнение' : type === 'buy' ? 'Покупка' : 'Продажа';
    showToast('Детали операции', `${typeText} ${amount} ${currency}`, 'info');
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div><strong>${title}</strong></div>
        <div>${message}</div>
    `;
    // Ограничиваем максимум двумя уведомлениями
    if (toastContainer) {
        while (toastContainer.children.length >= 2) {
            toastContainer.removeChild(toastContainer.firstElementChild);
        }
    }

    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Функции для обновления статистики
function updateMonthlyChange(newChange) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.monthlyChange = newChange;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

function updateAssetsCount(newCount) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.assetsCount = newCount;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

function updateActiveStakes(newStakes) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.activeStakes = newStakes;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

// Функция для получения текущей статистики
function getCurrentStats() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBalance = user ? user.balance : 0;
    
    // Если баланс нулевой, возвращаем нули
    if (userBalance <= 0) {
        return {
            monthlyChange: 0,
            assetsCount: 0,
            activeStakes: 0
        };
    }
    
    return JSON.parse(localStorage.getItem('userStats')) || {
        monthlyChange: 2.92,
        assetsCount: 5,
        activeStakes: 3
    };
}

// Обработчики форм
document.addEventListener('DOMContentLoaded', function() {
    const depositForm = document.getElementById('depositForm');
    const withdrawForm = document.getElementById('withdrawForm');
    
            if (depositForm) {
            depositForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('depositAmount').value);
                const user = JSON.parse(localStorage.getItem('user'));
                user.balance += amount;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Синхронизируем с сервером
                if (window.BalanceSync) {
                    await window.BalanceSync.updateServerBalance(user.balance);
                }
                
                // Пересчитываем показатели без случайностей
                ensureMonthlySnapshot(user.balance);
                await loadBalanceAndStats();
                closeModal('depositModal');
                showToast('Успех', `Баланс пополнен на $${amount.toFixed(2)}`, 'success');
            });
        }
    
            if (withdrawForm) {
            withdrawForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('withdrawAmount').value);
                const user = JSON.parse(localStorage.getItem('user'));
                
                if (amount > user.balance) {
                    showToast('Ошибка', 'Недостаточно средств', 'error');
                    return;
                }
                
                user.balance -= amount;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Синхронизируем с сервером
                if (window.BalanceSync) {
                    await window.BalanceSync.updateServerBalance(user.balance);
                }
                
                // Пересчитываем показатели без случайностей
                ensureMonthlySnapshot(user.balance);
                await loadBalanceAndStats();
                closeModal('withdrawModal');
                showToast('Успех', `Выведено $${amount.toFixed(2)}`, 'success');
            });
        }
});



function openTransactionDetails(type, amount, currency) {
    // Можно добавить модальное окно с деталями транзакции
    console.log('Открытие деталей транзакции:', { type, amount, currency });
}

function scrollToTransactions() {
    const transactionsSection = document.querySelector('.transactions-section');
    if (transactionsSection) {
        transactionsSection.scrollIntoView({ behavior: 'smooth' });
        // Обновляем данные транзакций
        loadRecentTransactions();
        updateStatsDisplay();
    }
}

// Обработчики для кнопок покупки, продажи и ставок
function openBuyModal() {
    // Переходим на страницу покупки
    window.location.href = 'Buy.html';
}

function openSellModal() {
    // Переходим на страницу продажи
    window.location.href = 'Sale.html';
}

function openStakeModal() {
    // Переходим на страницу ставок
    window.location.href = 'Stavka.html';
}

// Функция для возврата назад
function goBack() {
    window.location.href = 'home.html';
}

// Снэпшот баланса для расчета изменения за месяц
function getMonthlySnapshot() {
    try {
        const raw = localStorage.getItem('monthlySnapshot');
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function setMonthlySnapshot(amount) {
    const snapshot = {
        amount: Number(amount) || 0,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('monthlySnapshot', JSON.stringify(snapshot));
    return snapshot;
}

function ensureMonthlySnapshot(currentBalance) {
    const snapshot = getMonthlySnapshot();
    const now = Date.now();
    if (!snapshot) {
        setMonthlySnapshot(currentBalance || 0);
        return;
    }
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const daysSince = (now - snapshotTime) / (1000 * 60 * 60 * 24);
    // Обновляем снэпшот, если старше 30 дней
    if (daysSince > 30) {
        setMonthlySnapshot(currentBalance || 0);
    }
}

// Assets Management Functions
let currentAssetsView = 'top'; // 'top' or 'my'

async function loadAssets() {
    if (currentAssetsView === 'top') {
        await loadTopAssets();
    } else {
        await loadMyAssets();
    }
}

async function loadTopAssets() {
    const container = document.getElementById('assetsList');
    if (!container) return;

    try {
        // Получаем данные о монетах из публичного API
        const response = await fetch('/api/coins/public', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
                // Сортируем по росту цены за день и берем топ-3
                const topCoins = data.data
                    .filter(coin => coin.priceChange !== undefined && coin.priceChange !== null)
                    .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
                    .slice(0, 3);
                
                displayTopAssets(container, topCoins);
            } else {
                showAssetsEmpty(container, 'Ошибка загрузки данных');
            }
        } else {
            console.error('Ошибка API при загрузке топ активов:', response.status);
            showAssetsEmpty(container, 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки топ активов:', error);
        showAssetsEmpty(container, 'Ошибка загрузки данных');
    }
}

async function loadMyAssets() {
    const container = document.getElementById('assetsList');
    if (!container) return;

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            loadUserOwnedAssets(container);
            return;
        }

        // Получаем ID пользователя из JWT токена
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        // Получаем портфель пользователя
        const response = await fetch(`/api/users/${userId}/portfolio`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]').filter(s => s.status === 'active');
            const hasAssets = data.success && data.portfolio && data.portfolio.length > 0;
            if (hasAssets) {
                displayMyAssets(container, data.portfolio);
                if (activeStakes.length > 0) appendActiveStakesToAssets(container, activeStakes);
            } else {
                // If no assets but there are active stakes – show them here
                if (activeStakes.length > 0) {
                    container.innerHTML = '';
                    appendActiveStakesToAssets(container, activeStakes);
                } else {
                    // Load user owned assets from localStorage instead of showing empty
                    loadUserOwnedAssets(container);
                }
            }
        } else if (response.status === 404) {
            const activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]').filter(s => s.status === 'active');
            if (activeStakes.length > 0) {
                container.innerHTML = '';
                appendActiveStakesToAssets(container, activeStakes);
            } else {
                // Load user owned assets from localStorage instead of showing empty
                loadUserOwnedAssets(container);
            }
        } else {
            console.error('Ошибка API при загрузке портфеля:', response.status);
            // Load user owned assets from localStorage as fallback
            loadUserOwnedAssets(container);
        }
    } catch (error) {
        console.error('Ошибка загрузки моих активов:', error);
        // Load user owned assets from localStorage as fallback
        loadUserOwnedAssets(container);
    }
}

// New function to load user owned assets from localStorage
function loadUserOwnedAssets(container) {
    // Get spot trading balance
    const spotBalance = JSON.parse(localStorage.getItem('spotBalance') || '{}');
    
    // Get all owned cryptocurrencies (excluding USDT)
    const ownedAssets = Object.entries(spotBalance)
        .filter(([symbol, amount]) => symbol !== 'USDT' && amount > 0)
        .map(([symbol, amount]) => ({
            coinSymbol: symbol,
            coinName: getCoinNameBySymbol(symbol),
            balance: amount,
            profitLossPercent: 0 // We don't have real-time profit/loss data
        }));
    
    // Get purchased assets from purchases history
    const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    
    // Calculate net purchases (purchases - sales)
    const netPurchases = {};
    purchases.forEach(purchase => {
        const symbol = purchase.coinSymbol;
        if (!netPurchases[symbol]) {
            netPurchases[symbol] = {
                coinSymbol: symbol,
                coinName: purchase.coinName,
                amount: 0,
                totalSpent: 0
            };
        }
        netPurchases[symbol].amount += purchase.coinAmount;
        netPurchases[symbol].totalSpent += purchase.amount;
    });
    
    sales.forEach(sale => {
        const symbol = sale.coinSymbol;
        if (netPurchases[symbol]) {
            netPurchases[symbol].amount -= sale.coinAmount;
            netPurchases[symbol].totalSpent -= sale.amount;
        }
    });
    
    // Add net purchases that have positive amounts
    Object.values(netPurchases).forEach(purchase => {
        if (purchase.amount > 0) {
            const existingAsset = ownedAssets.find(asset => asset.coinSymbol === purchase.coinSymbol);
            if (existingAsset) {
                existingAsset.balance += purchase.amount;
            } else {
                ownedAssets.push({
                    coinSymbol: purchase.coinSymbol,
                    coinName: purchase.coinName,
                    balance: purchase.amount,
                    profitLossPercent: 0
                });
            }
        }
    });
    
    // Final filter to ensure only positive balances are shown
    const filteredAssets = ownedAssets.filter(asset => asset.balance > 0);
    
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]').filter(s => s.status === 'active');
    
    if (filteredAssets.length > 0) {
        displayMyAssets(container, filteredAssets);
        if (activeStakes.length > 0) appendActiveStakesToAssets(container, activeStakes);
    } else {
        // If no assets but there are active stakes – show them here
        if (activeStakes.length > 0) {
            container.innerHTML = '';
            appendActiveStakesToAssets(container, activeStakes);
        } else {
            showAssetsEmpty(container, 'Нет активных сделок');
        }
    }
}

// Helper function to get coin name by symbol
function getCoinNameBySymbol(symbol) {
    const coinNames = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'BNB': 'Binance Coin',
        'SOL': 'Solana',
        'ADA': 'Cardano',
        'XRP': 'Ripple',
        'DOT': 'Polkadot',
        'DOGE': 'Dogecoin',
        'AVAX': 'Avalanche',
        'LINK': 'Chainlink',
        'MATIC': 'Polygon',
        'UNI': 'Uniswap',
        'LTC': 'Litecoin',
        'XLM': 'Stellar',
        'ATOM': 'Cosmos',
        'XMR': 'Monero',
        'ALGO': 'Algorand',
        'VET': 'VeChain',
        'FIL': 'Filecoin',
        'ICP': 'Internet Computer',
        'TRX': 'TRON'
    };
    return coinNames[symbol] || symbol;
}

function displayTopAssets(container, coins) {
    if (!coins || coins.length === 0) {
        showAssetsEmpty(container, 'Нет данных');
        return;
    }

    container.innerHTML = coins.map(coin => {
        const priceChange = coin.priceChange || 0;
        const changeClass = priceChange >= 0 ? 'positive' : 'negative';
        const changeIcon = priceChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="asset-item" onclick="openAssetDetails('${coin.id || coin.symbol}')">
                <div class="asset-icon">
                    <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coin.symbol) : '/logos/default.svg'}" 
                         alt="${coin.name}" 
                         onerror="this.src='/logos/default.svg'">
                </div>
                <div class="asset-info">
                    <div class="asset-name">${coin.name || coin.symbol}</div>
                    <div class="asset-symbol">${coin.symbol}</div>
                    <div class="asset-price">$${formatCurrency(coin.price || 0)}</div>
                </div>
                <div class="asset-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

function displayMyAssets(container, portfolio) {
    if (!portfolio || portfolio.length === 0) {
        showAssetsEmpty(container, 'Нет активов');
        return;
    }

    // Filter out assets with zero or negative balance
    const filteredPortfolio = portfolio.filter(asset => {
        const balance = asset.balance || 0;
        return balance > 0;
    });

    // If no assets have positive balance, show empty state
    if (filteredPortfolio.length === 0) {
        showAssetsEmpty(container, 'Нет активов');
        return;
    }

    container.innerHTML = filteredPortfolio.map(asset => {
        const balance = asset.balance || 0;
        const coinSymbol = asset.coinSymbol;
        
        return `
            <div class="asset-item" onclick="openAssetDetails('${coinSymbol}')">
                <div class="asset-icon">
                    <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coinSymbol) : '/logos/default.svg'}" 
                         alt="${asset.coinName}" 
                         onerror="this.src='/logos/default.svg'">
                </div>
                <div class="asset-info">
                    <div class="asset-name">${asset.coinName || coinSymbol}</div>
                    <div class="asset-symbol">${coinSymbol}</div>
                    <div class="asset-quantity">${balance.toFixed(8)} ${coinSymbol}</div>
                </div>
                <div class="asset-actions">
                    <span class="available-label">Доступно для продажи</span>
                    <button class="sell-btn" onclick="event.stopPropagation(); goToSpotTradingWithCoin('${coinSymbol}')">
                        <i class="fas fa-arrow-down"></i>
                        Продать
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showAssetsEmpty(container, message) {
    const isDealsEmpty = message === 'Нет активов' || message === 'Нет активных сделок';
    const headerText = isDealsEmpty ? 'Нет активных сделок' : message;
    const paragraphText = isDealsEmpty ? 'У вас пока нет активных сделок' : 'Попробуйте обновить страницу';
    const actionButton = isDealsEmpty ? '<button class="text-btn" onclick="window.location.href=\'coins.html\'">Начать торговлю</button>' : '';

    container.innerHTML = `
        <div class="assets-empty">
            <i class="fas fa-wallet"></i>
            <h3>${headerText}</h3>
            <p>${paragraphText}</p>
            ${actionButton}
        </div>
    `;
}

// Append active stakes block into assets list
function appendActiveStakesToAssets(container, activeStakes) {
    const block = document.createElement('div');
    block.className = 'active-stakes-inline';
    block.innerHTML = `
        <div class="section-header">
            <h2>Активные сделки</h2>
            <span class="stakes-count">${activeStakes.length}</span>
        </div>
        <div class="stakes-list">
            ${activeStakes.map(stake => {
                const timeLeftMs = new Date(stake.endTime) - new Date();
                const hours = Math.max(0, Math.floor(timeLeftMs / (1000 * 60 * 60)));
                const minutes = Math.max(0, Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60)));
                const seconds = Math.max(0, Math.floor((timeLeftMs % (1000 * 60)) / 1000));
                const total = new Date(stake.endTime) - new Date(stake.startTime);
                const elapsed = Date.now() - new Date(stake.startTime).getTime();
                const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
                return `
                <div class="stake-item">
                    <div class="stake-info">
                        <div class="stake-coin">${stake.coinName} (${stake.coinSymbol})</div>
                        <div class="stake-details">$${Number(stake.amount || 0).toFixed(2)} • ${getPeriodText(stake.period || stake.timeHours * 60)}</div>
                    </div>
                    <div class="stake-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                        <div class="timer-value">${hours}ч ${minutes}м ${seconds}с</div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
    container.appendChild(block);

    // Start per-second updater for inline stakes
    if (window._inlineStakesTimer) clearInterval(window._inlineStakesTimer);
    window._inlineStakesTimer = setInterval(() => {
        const saved = JSON.parse(localStorage.getItem('activeStakes') || '[]').filter(s => s.status === 'active');
        const list = container.querySelectorAll('.active-stakes-inline .stake-item');
        list.forEach((el, idx) => {
            const stake = saved[idx];
            if (!stake) return;
            const timeLeft = new Date(stake.endTime) - new Date();
            const hours = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
            const minutes = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
            const seconds = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000));
            const total = new Date(stake.endTime) - new Date(stake.startTime);
            const elapsed = Date.now() - new Date(stake.startTime).getTime();
            const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
            const timerEl = el.querySelector('.timer-value');
            const barEl = el.querySelector('.progress-fill');
            if (timerEl) timerEl.textContent = `${hours}ч ${minutes}м ${seconds}с`;
            if (barEl) barEl.style.width = `${progress}%`;
        });
        // stop timer if no active block remains
        if (!document.querySelector('.active-stakes-inline')) {
            clearInterval(window._inlineStakesTimer);
            window._inlineStakesTimer = null;
        }
    }, 1000);
}

function switchAssetsView(view) {
    currentAssetsView = view;
    
    // Обновляем активные кнопки
    const topBtn = document.getElementById('topAssetsBtn');
    const myBtn = document.getElementById('myAssetsBtn');
    
    if (topBtn && myBtn) {
        topBtn.classList.toggle('active', view === 'top');
        myBtn.classList.toggle('active', view === 'my');
    }
    
    // Загружаем соответствующие данные
    loadAssets();
}

function openAssetDetails(assetId) {
    window.location.href = `coininfo.html?coin=${assetId}`;
}

// Function to navigate to spot trading with specific coin
function goToSpotTradingWithCoin(coinSymbol) {
    // Get coin data and set it in localStorage for spot trading
    const coinsData = JSON.parse(localStorage.getItem('coinsData') || '[]');
    const coin = coinsData.find(c => c.symbol.toUpperCase() === coinSymbol.toUpperCase());
    
    if (coin) {
        localStorage.setItem('currentCoin', JSON.stringify(coin));
    }
    
    window.location.href = `spot-trading.html?coin=${coinSymbol}`;
}

// Initialize sections state
function initializeSections() {
    // По умолчанию секция транзакций свернута
    const transactionsList = document.getElementById('recentTransactions');
    const toggleIcon = document.getElementById('transactionsToggleIcon');
    
    if (transactionsList && toggleIcon) {
        transactionsList.classList.add('collapsed');
        toggleIcon.classList.remove('rotated');
    }
}

// Transactions Toggle Function
function toggleTransactions() {
    const transactionsList = document.getElementById('recentTransactions');
    const toggleIcon = document.getElementById('transactionsToggleIcon');
    
    if (transactionsList && toggleIcon) {
        const isCollapsed = transactionsList.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Разворачиваем - стрелочка вверх
            transactionsList.classList.remove('collapsed');
            toggleIcon.classList.add('rotated');
        } else {
            // Сворачиваем - стрелочка вниз
            transactionsList.classList.add('collapsed');
            toggleIcon.classList.remove('rotated');
        }
    }
}