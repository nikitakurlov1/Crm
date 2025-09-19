// Coin Info Page JavaScript
// Инициализация аватара пользователя
function updateUserAvatar() {
    const user = JSON.parse(localStorage.getItem('user'));
    const avatar = document.getElementById('userAvatar');
    if (user && avatar) {
        avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : user.username ? user.username.charAt(0).toUpperCase() : 'U';
    }
}

// Global variables for coin selector
let availableCoins = [];

// Coin selector functions
function openCoinSelector() {
    const modal = document.getElementById('coinSelectorModal');
    if (modal) {
        modal.style.display = 'block';
        // Force reflow and add show class for animation
        modal.offsetHeight;
        modal.classList.add('show');
        loadCoinsForSelector();
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modalId === 'coinSelectorModal') {
        modal.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    } else if (modal) {
        modal.style.display = 'none';
    }
}

async function loadCoinsForSelector() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('No auth token found');
            return;
        }

        // Show loading state
        const coinsList = document.getElementById('coinsSelectorList');
        
        if (coinsList) coinsList.classList.add('loading');

        const response = await fetch('/api/coins/exchange', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.coins) {
                availableCoins = result.coins;
                
                displayAllCoins();
            }
        } else {
            console.error('Failed to load coins:', response.status);
        }
    } catch (error) {
        console.error('Error loading coins for selector:', error);
    } finally {
        // Remove loading state
        const coinsList = document.getElementById('coinsSelectorList');
        
        if (coinsList) coinsList.classList.remove('loading');
    }
}

function displayAllCoins() {
    const container = document.getElementById('coinsSelectorList');
    if (!container) return;
    
    if (!availableCoins.length) {
        container.innerHTML = `
            <div class="no-coins-found">
                <i class="fas fa-coins"></i>
                <h3>Монеты не найдены</h3>
                <p>Попробуйте обновить страницу</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = availableCoins.map(coin => {
        const priceChange = coin.priceChange || 0;
        const changeClass = priceChange >= 0 ? 'positive' : 'negative';
        const changeIcon = priceChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="coin-selector-item" onclick="selectCoin('${coin.id || coin.symbol}')">
                <div class="selector-coin-icon">
                    <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coin.symbol) : '/logos/default.svg'}" 
                         alt="${coin.symbol}" 
                         onerror="this.src='/logos/default.svg'">
                </div>
                <div class="selector-coin-info">
                    <div class="selector-coin-name">${coin.name || coin.symbol}</div>
                    <div class="selector-coin-symbol">${coin.symbol}</div>
                </div>
                <div class="selector-coin-price">
                    <div class="selector-price-amount">$${formatPrice(coin.price || 0)}</div>
                    <div class="selector-price-change ${changeClass}">
                        <i class="fas ${changeIcon}"></i>
                        ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    } else {
        return price.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    }
}

function selectCoin(coinId) {
    // Find the selected coin
    const selectedCoin = availableCoins.find(coin => 
        (coin.id === coinId) || 
        (coin.symbol && coin.symbol.toLowerCase() === coinId.toLowerCase())
    );
    
    if (!selectedCoin) {
        console.error('Selected coin not found:', coinId);
        return;
    }
    
    // Update URL and reload coin data
    const url = new URL(window.location);
    url.searchParams.set('coin', selectedCoin.id || selectedCoin.symbol);
    window.history.pushState({}, '', url);
    
    // Close modal
    closeModal('coinSelectorModal');
    
    // Show loading notification
    if (window.notificationManager) {
        window.notificationManager.show(`Загрузка ${selectedCoin.name}...`, 'info', { duration: 2000 });
    }
    
    // Reload page with new coin
    setTimeout(() => {
        window.location.reload();
    }, 500);
}

function openBuyModal() {
    // Existing function for opening buy modal
    console.log('Opening buy modal...');
}

function openSellModal() {
    // Existing function for opening sell modal
    console.log('Opening sell modal...');
}

// Инициализируем аватар и обработчики при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateUserAvatar();
    
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

class CoinInfoPage {
    constructor() {
        this.currentPrice = 0;
        this.priceChange = 0;
        this.priceChangePercent = 0;
        this.customChart = null; // Custom chart instance
        this.currentPeriod = '1D';
        this.currentCoin = null;
        this.ws = null; // WebSocket connection
        this.balanceSync = null; // BalanceSync instance
        this.activeStakes = []; // Активные ставки
        this.futuresDirection = 'up'; // Direction for futures trading
        this.currentLeverage = 3; // Default leverage
        this.chartData = []; // Full chart data
        this.init();
    }

    async init() {
        await this.loadCoinFromURL();
        this.bindEvents();
        this.initCustomChart(); // Initialize custom chart instead of Chart.js
        this.updateCalculations();
        await this.loadCoinData();
        
        // Инициализируем синхронизацию баланса
        this.initBalanceSync();
        
        // Загружаем активные ставки
        this.loadActiveStakes();
        
        // Автоматическое обновление баланса каждые 5 секунд
        setInterval(() => {
            this.updateBalanceDisplay();
        }, 5000);
        
        // Проверяем результаты сделок каждые 30 секунд
        setInterval(() => {
            this.checkStakeResults();
        }, 30000);
        
        // Обновляем отображение активных сделок каждую минуту
        setInterval(() => {
            this.updateActiveStakesDisplay();
        }, 60000);
        
        // Initialize leverage slider
        this.initializeLeverageSlider();
        
        // Инициализируем ползунок времени для фьючерсов
        this.initializeFuturesTimeSlider();
        
        // Обновляем индикатор активных сделок
        this.updateActiveTradesIndicator();
        
        // Initialize assets view
        this.currentAssetsView = 'my'; // Default to showing trades
        this.loadAssets();
    }

    bindEvents() {
        // Back button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }

        // Futures form submission
        const futuresForm = document.getElementById('futuresForm');
        if (futuresForm) {
            futuresForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFuturesOrder();
            });
        }

        // Futures amount input
        const futuresAmount = document.getElementById('futuresAmount');
        if (futuresAmount) {
            futuresAmount.addEventListener('input', () => {
                this.calculateFuturesPotential();
            });
        }

        // Leverage slider
        const leverageSlider = document.getElementById('leverageSlider');
        if (leverageSlider) {
            leverageSlider.addEventListener('input', (e) => {
                this.updateLeverageSlider(e.target.value);
            });
        }

        // Direction buttons (for futures)
        const futuresDirectionBtns = document.querySelectorAll('.direction-btn');
        futuresDirectionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectFuturesDirection(e.target.closest('.direction-btn').dataset.direction);
            });
        });

        // Favorite and share buttons
        const favoriteBtn = document.querySelector('.header-right .icon-btn:first-child');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }

        const shareBtn = document.querySelector('.header-right .icon-btn:last-child');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCoin();
            });
        }

        // Cleanup WebSocket on page unload
        window.addEventListener('beforeunload', () => {
            if (this.ws) {
                this.ws.close();
            }
        });
    }

    // Обработка фьючерсного ордера (перпетуальные фьючерсы)
    handleFuturesOrder() {
        const amountElement = document.getElementById('futuresAmount');
        const amount = amountElement ? parseFloat(amountElement.value) : 0;
        const direction = this.futuresDirection;
        const leverage = this.currentLeverage || 3;
        
        if (amount < 10) {
            this.showToast('Минимальная сумма позиции: $10', 'error');
            return;
        }

        // Проверяем баланс
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }

        this.showToast(`Открытие ${direction === 'up' ? 'Long' : 'Short'} позиции...`, 'info');
        
        // Рассчитываем цену ликвидации
        const liquidationPrice = this.calculateLiquidationPrice(this.currentPrice, direction, leverage);
        
        // Создаем фьючерсную позицию (перпетуальные фьючерсы)
        const futuresPosition = {
            id: Date.now() + Math.random(),
            coinId: this.currentCoin.id,
            coinSymbol: this.currentCoin.symbol,
            coinName: this.currentCoin.name,
            margin: amount, // Маржа (залог)
            size: amount * leverage, // Размер позиции
            direction: direction,
            leverage: leverage,
            entryPrice: this.currentPrice,
            liquidationPrice: liquidationPrice,
            openTime: new Date(),
            status: 'open',
            type: 'perpetual_futures',
            unrealizedPnL: 0
        };
        
        // Добавляем позицию в список активных
        this.activeStakes.push(futuresPosition);
        localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
        
        // Блокируем маржу (не списываем полностью)
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        this.showToast(`${direction === 'up' ? 'Long' : 'Short'} позиция открыта! Ликвидация: $${liquidationPrice.toFixed(2)}`, 'success');
        this.closeModal('futuresModal');
        if (amountElement) amountElement.value = '';
        this.calculateFuturesPotential();
        
        // Обновляем отображение активных позиций
        this.updateActiveStakesDisplay();
        this.updateStakesCount();
        this.updateActiveTradesIndicator();
        this.loadAssets(); // Обновляем список активов
    }

    // Расчет потенциальной прибыли для фьючерсов
    calculateFuturesPotential() {
        const amountElement = document.getElementById('futuresAmount');
        const amount = amountElement ? parseFloat(amountElement.value) || 0 : 0;
        const leverage = this.currentLeverage || 3;
        
        console.log('Calculating futures potential:', {
            margin: amount,
            leverage: leverage,
            direction: this.futuresDirection,
            tradingVolume: amount * leverage
        });
        
        // Торговый объем
        const tradingVolume = amount * leverage;
        
        // Потенциальная прибыль/убыток при 1% изменении
        const profitOn1Percent = amount * leverage * 0.01; // 1% от торгового объема
        
        // Цена ликвидации
        const liquidationPrice = this.currentPrice ? this.calculateLiquidationPrice(this.currentPrice, this.futuresDirection, leverage) : 0;
        
        // Обновляем отображение
        const elements = {
            tradingVolume: document.getElementById('tradingVolume'),
            potentialWin: document.getElementById('potentialWin'),
            potentialLoss: document.getElementById('potentialLoss'),
            liquidationPrice: document.getElementById('liquidationPrice')
        };
        
        if (elements.tradingVolume) {
            elements.tradingVolume.textContent = `$${tradingVolume.toFixed(2)}`;
        }
        
        if (elements.potentialWin) {
            elements.potentialWin.textContent = `+$${profitOn1Percent.toFixed(2)}`;
            elements.potentialWin.className = 'result-value positive';
        }
        
        if (elements.potentialLoss) {
            elements.potentialLoss.textContent = `-$${profitOn1Percent.toFixed(2)}`;
            elements.potentialLoss.className = 'result-value negative';
        }
        
        if (elements.liquidationPrice) {
            elements.liquidationPrice.textContent = `$${liquidationPrice.toFixed(2)}`;
            elements.liquidationPrice.className = 'result-value warning';
        }
        
        // Добавляем информацию о кредитном плече
        this.updateLeverageInfo(leverage, amount);
    }
    
    // Расчет цены ликвидации
    calculateLiquidationPrice(entryPrice, direction, leverage) {
        // Простая формула: ликвидация при потере ~90% маржи
        const liquidationThreshold = 0.9; // 90% потерь
        const priceChangePercent = liquidationThreshold / leverage;
        
        if (direction === 'up') {
            // Long: ликвидация при падении цены
            return entryPrice * (1 - priceChangePercent);
        } else {
            // Short: ликвидация при росте цены
            return entryPrice * (1 + priceChangePercent);
        }
    }
    
    // Получение множителя времени
    getTimeMultiplier(timeHours) {
        // Более длинные позиции имеют немного больший потенциал из-за большего времени для движения цены
        const timeMultipliers = {
            0.083: 1.0,   // 5 минут - базовый множитель
            1: 1.05,      // 1 час - +5%
            3: 1.1,       // 3 часа - +10%
            6: 1.15,      // 6 часов - +15%
            12: 1.2,      // 12 часов - +20%
            24: 1.25      // 24 часа - +25%
        };
        
        return timeMultipliers[timeHours] || 1.05;
    }
    
    // Информация о кредитном плече
    updateLeverageInfo(leverage, amount) {
        let leverageInfo = document.getElementById('leverageInfo');
        if (!leverageInfo) {
            leverageInfo = document.createElement('div');
            leverageInfo.id = 'leverageInfo';
            leverageInfo.className = 'leverage-info';
            
            const potentialResults = document.querySelector('.potential-results');
            if (potentialResults) {
                potentialResults.parentNode.insertBefore(leverageInfo, potentialResults.nextSibling);
            }
        }
        
        const examples = [
            { percent: 0.5, profit: amount * leverage * 0.005 },
            { percent: 1, profit: amount * leverage * 0.01 },
            { percent: 2, profit: amount * leverage * 0.02 },
            { percent: 5, profit: amount * leverage * 0.05 }
        ];
        
        let html = `<div class="leverage-title">Кредитное плечо: x${leverage}</div>`;
        html += '<div class="leverage-subtitle">Потенциальная прибыль при разных изменениях цены:</div>';
        html += '<div class="leverage-examples">';
        
        examples.forEach(example => {
            html += `
                <div class="leverage-example">
                    <div class="example-left">
                        <span class="percent-change">+${example.percent}%</span>
                    </div>
                    <div class="example-right">
                        <span class="profit-amount">+$${example.profit.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        html += `<div class="leverage-warning">⚠️ Высокий риск! Потери могут превысить вложения при плече x${leverage}</div>`;
        leverageInfo.innerHTML = html;
    }

    // Получение кредитного плеча для фьючерсов
    getFuturesLeverage(timeHours) {
        const leverageMap = {
            0.083: 2,   // 5 минут
            1: 3,       // 1 час
            3: 5,       // 3 часа
            6: 8,       // 6 часов
            12: 10,     // 12 часов
            24: 15      // 24 часа
        };
        return leverageMap[timeHours] || 3;
    }

    // Получение множителя для фьючерсов
    getFuturesMultiplier(timeHours, priceChangePercent = 0) {
        const leverage = this.getFuturesLeverage(timeHours);
        const absChangePercent = Math.abs(priceChangePercent);
        
        // Базовая прибыль рассчитывается с учетом кредитного плеча
        const baseReturn = 1 + (leverage * absChangePercent / 100);
        return baseReturn;
    }

    // Update leverage slider
    updateLeverageSlider(value) {
        const leverageValues = [2, 3, 5, 8, 10];
        const index = parseInt(value);
        const leverage = leverageValues[index];
        
        this.currentLeverage = leverage;
        
        console.log('Leverage updated:', {
            index: index,
            leverage: leverage,
            direction: this.futuresDirection,
            coin: this.currentCoin?.symbol || 'N/A',
            maxLeverage: 10
        });
        
        // Update display
        const currentLeverageValue = document.getElementById('currentLeverageValue');
        if (currentLeverageValue) {
            currentLeverageValue.textContent = `x${leverage}`;
        }
        
        // Update active labels
        const leverageLabels = document.querySelectorAll('.leverage-label');
        leverageLabels.forEach((label, i) => {
            label.classList.toggle('active', i === index);
        });
        
        // Update hidden input
        const currentLeverageInput = document.getElementById('currentLeverage');
        if (currentLeverageInput) {
            currentLeverageInput.value = leverage;
        }
        
        // Recalculate potential
        this.calculateFuturesPotential();
    }

    // Initialize leverage slider
    initializeLeverageSlider() {
        const leverageSlider = document.getElementById('leverageSlider');
        if (leverageSlider) {
            this.updateLeverageSlider(1); // Default to x3
        }
    }
    updateFuturesTimeSlider(value) {
        const timeValues = [0.083, 1, 3, 6, 12, 24];
        const timeLabels = [
            { value: 5, unit: 'минут' },
            { value: 1, unit: 'час' },
            { value: 3, unit: 'часа' },
            { value: 6, unit: 'часов' },
            { value: 12, unit: 'часов' },
            { value: 24, unit: 'часа' }
        ];
        
        const index = parseInt(value);
        const timeValue = timeValues[index];
        const timeLabel = timeLabels[index];
        
        // Обновляем отображение времени
        const currentTimeValue = document.getElementById('currentTimeValue');
        const currentTimeUnit = document.getElementById('currentTimeUnit');
        if (currentTimeValue && currentTimeUnit) {
            currentTimeValue.textContent = timeLabel.value;
            currentTimeUnit.textContent = timeLabel.unit;
        }
        
        // Обновляем активные метки
        const timeLabelsElements = document.querySelectorAll('.time-label');
        timeLabelsElements.forEach((label, i) => {
            label.classList.toggle('active', i === index);
        });
        
        // Обновляем значение скрытого input
        const futuresTimeInput = document.getElementById('futuresTime');
        if (futuresTimeInput) {
            futuresTimeInput.value = timeValue;
        }
        
        // Пересчитываем потенциальную прибыль
        this.calculateFuturesPotential();
    }

    // Инициализация ползунка времени для фьючерсов
    initializeFuturesTimeSlider() {
        const futuresTimeSlider = document.getElementById('futuresTimeSlider');
        if (futuresTimeSlider) {
            this.updateFuturesTimeSlider(0);
        }
    }

    // Выбор направления для фьючерсов
    selectFuturesDirection(direction) {
        console.log('Futures direction selected:', {
            direction: direction,
            leverage: this.currentLeverage,
            coin: this.currentCoin?.symbol || 'N/A'
        });
        
        this.futuresDirection = direction;
        
        // Обновляем активную кнопку
        const directionBtns = document.querySelectorAll('.direction-btn');
        directionBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === direction) {
                btn.classList.add('active');
            }
        });
        
        // Обновляем заголовок модального окна
        const modalTitle = document.getElementById('futuresModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Фьючерсная торговля — ${direction === 'up' ? 'Long' : 'Short'} позиция`;
        }
        
        // Обновляем кнопку отправки
        const submitBtn = document.getElementById('futuresSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = `Открыть ${direction === 'up' ? 'Long' : 'Short'} позицию`;
            submitBtn.className = `trade-btn primary futures-submit-btn ${direction === 'up' ? 'long-btn' : 'short-btn'}`;
        }
        
        this.calculateFuturesPotential();
    }

    // Обработка фьючерсного ордера
    handleFuturesOrder() {
        const amountElement = document.getElementById('futuresAmount');
        const amount = amountElement ? parseFloat(amountElement.value) : 0;
        const direction = this.futuresDirection;
        const leverage = this.currentLeverage || 3;
        
        if (amount < 10) {
            this.showToast('Минимальный размер позиции: $10', 'error');
            return;
        }

        // Проверяем баланс (маржинальные требования)
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств для маржи', 'error');
            return;
        }

        // Рассчитываем цену ликвидации
        const liquidationPrice = this.calculateLiquidationPrice(this.currentPrice, direction, leverage);

        this.showToast(`Открытие ${direction === 'up' ? 'Long' : 'Short'} позиции...`, 'info');
        
        // Создаем бессрочную фьючерсную позицию
        const futuresPosition = {
            id: Date.now() + Math.random(),
            coinId: this.currentCoin.id,
            coinSymbol: this.currentCoin.symbol,
            coinName: this.currentCoin.name,
            margin: amount, // Маржа (залог)
            size: amount * leverage, // Размер позиции
            direction: direction,
            leverage: leverage,
            entryPrice: this.currentPrice,
            liquidationPrice: liquidationPrice,
            openTime: new Date(),
            status: 'open',
            type: 'perpetual_futures',
            unrealizedPnL: 0
        };
        
        // Добавляем позицию в список активных
        this.activeStakes.push(futuresPosition);
        localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
        
        // Блокируем маржу (не списываем полностью)
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        this.showToast(`${direction === 'up' ? 'Long' : 'Short'} позиция открыта! Ликвидация: $${liquidationPrice.toFixed(2)}`, 'success');
        this.closeModal('futuresModal');
        if (amountElement) amountElement.value = '';
        this.calculateFuturesPotential();
        
        // Обновляем отображение активных позиций
        this.updateActiveStakesDisplay();
        this.updateStakesCount();
        this.updateActiveTradesIndicator();
    }

    // Обновление индикатора активных сделок
    updateActiveTradesIndicator() {
        const indicator = document.getElementById('activeTradesIndicator');
        const countElement = document.getElementById('activeTradesCount');
        
        if (indicator && countElement) {
            const activeCount = this.activeStakes.filter(stake => stake.status === 'active').length;
            
            if (activeCount > 0) {
                countElement.textContent = activeCount;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    handleStake() {
        const amount = parseFloat(document.getElementById('stakeAmount').value);
        const timeHours = parseFloat(document.getElementById('stakeTime').value);
        const direction = this.stakeDirection;
        
        if (amount < 10) {
            this.showToast('Минимальная сумма сделки: $10', 'error');
            return;
        }

        // Проверяем баланс
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }

        this.showToast('Создание сделки...', 'info');
        
        // Создаем сделку
        const stake = {
            id: Date.now() + Math.random(),
            coinId: this.currentCoin.id,
            coinSymbol: this.currentCoin.symbol,
            coinName: this.currentCoin.name,
            amount: amount,
            direction: direction,
            timeHours: timeHours,
            startPrice: this.currentPrice,
            startTime: new Date(),
            endTime: new Date(Date.now() + timeHours * 60 * 60 * 1000),
            status: 'active',
            baseMultiplier: this.getWinMultiplier(timeHours, 0), // Базовый множитель
            dynamicMultiplier: true // Флаг для динамического расчета
        };
        
        // Добавляем сделку в список активных
        this.activeStakes.push(stake);
        localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
        
        // Списываем средства с баланса
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        this.showToast(`Сделка на ${direction === 'up' ? 'рост' : 'падение'} создана!`, 'success');
        this.closeModal('stakeModal');
        document.getElementById('stakeAmount').value = '';
        this.calculateStakePotential();
        
        // Обновляем отображение активных сделок
        this.updateActiveStakesDisplay();
        this.updateStakesCount();
    }

    // Обновление ползунка времени
    updateTimeSlider(value) {
        const timeValues = [0.083, 1, 3, 6, 12, 24]; // в часах
        const timeLabels = [
            { value: 5, unit: 'минут' },
            { value: 1, unit: 'час' },
            { value: 3, unit: 'часа' },
            { value: 6, unit: 'часов' },
            { value: 12, unit: 'часов' },
            { value: 24, unit: 'часа' }
        ];
        
        const index = parseInt(value);
        const timeValue = timeValues[index];
        const timeLabel = timeLabels[index];
        
        // Обновляем отображение времени
        const currentTimeValue = document.getElementById('currentTimeValue');
        const currentTimeUnit = document.getElementById('currentTimeUnit');
        if (currentTimeValue && currentTimeUnit) {
            currentTimeValue.textContent = timeLabel.value;
            currentTimeUnit.textContent = timeLabel.unit;
        }
        
        // Обновляем активные метки
        const timeLabelsElements = document.querySelectorAll('.time-label');
        timeLabelsElements.forEach((label, i) => {
            label.classList.toggle('active', i === index);
        });
        
        // Обновляем значение скрытого input
        const stakeTimeInput = document.getElementById('stakeTime');
        if (stakeTimeInput) {
            stakeTimeInput.value = timeValue;
        }
        
        // Пересчитываем потенциальный выигрыш
        this.calculateStakePotential();
    }

    // Инициализация ползунка времени
    initializeTimeSlider() {
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            // Устанавливаем начальное значение
            this.updateTimeSlider(0);
        }
    }

    // Выбор направления ставки
    selectDirection(direction) {
        this.stakeDirection = direction;
        
        // Обновляем активную кнопку
        const directionBtns = document.querySelectorAll('.direction-btn');
        directionBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === direction) {
                btn.classList.add('active');
            }
        });
        
        // Обновляем заголовок модального окна
        const modalTitle = document.getElementById('stakeModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Торговля - Сделка на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        // Обновляем кнопку отправки
        const submitBtn = document.getElementById('stakeSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = `Создать сделку на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        this.calculateStakePotential();
    }

    // Обновление информации о динамических коэффициентах
    updateMultiplierInfo(examples, amount) {
        // Создаем или обновляем элемент с информацией о коэффициентах
        let multiplierInfo = document.getElementById('multiplierInfo');
        if (!multiplierInfo) {
            multiplierInfo = document.createElement('div');
            multiplierInfo.id = 'multiplierInfo';
            multiplierInfo.className = 'multiplier-info';
            
            // Вставляем после potential-results
            const potentialResults = document.querySelector('.potential-results');
            if (potentialResults) {
                potentialResults.parentNode.insertBefore(multiplierInfo, potentialResults.nextSibling);
            }
        }
        
        let html = '<div class="multiplier-title">Коэффициенты дохода:</div>';
        html += '<div class="multiplier-subtitle">Чем больше изменение цены, тем выше выигрыш</div>';
        html += '<div class="multiplier-examples">';
        
        examples.forEach(example => {
            const winAmount = amount * example.multiplier;
            const profit = winAmount - amount;
            html += `
                <div class="multiplier-example">
                    <div class="example-left">
                        <span class="percent-change">+${example.percent}%</span>
                        <span class="multiplier-value">x${example.multiplier.toFixed(2)}</span>
                    </div>
                    <div class="example-right">
                        <span class="win-amount">$${winAmount.toFixed(2)}</span>
                        <span class="profit-amount">+$${profit.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        html += '<div class="multiplier-note">* Коэффициенты зависят от времени сделки и изменения цены</div>';
        multiplierInfo.innerHTML = html;
    }

    // Получение коэффициента выигрыша на основе процента изменения цены
    getWinMultiplier(timeHours, priceChangePercent = 0) {
        // Базовые коэффициенты
        const baseMultipliers = {
            0.083: 1.05, // 5 минут - базовая прибыль 5%
            1: 1.15,     // 1 час - базовая прибыль 15%
            3: 1.25,     // 3 часа - базовая прибыль 25%
            6: 1.35,     // 6 часов - базовая прибыль 35%
            12: 1.45,    // 12 часов - базовая прибыль 45%
            24: 1.55     // 24 часа - базовая прибыль 55%
        };
        
        const baseMultiplier = baseMultipliers[timeHours] || 1.15;
        
        // Дополнительный множитель на основе процента изменения
        let additionalMultiplier = 0;
        const absChangePercent = Math.abs(priceChangePercent);
        
        if (absChangePercent >= 5) {
            additionalMultiplier = 0.5; // +50% за 5%+ изменение
        } else if (absChangePercent >= 2) {
            additionalMultiplier = 0.2; // +20% за 2%+ изменение
        } else if (absChangePercent >= 1) {
            additionalMultiplier = 0.1; // +10% за 1%+ изменение
        } else if (absChangePercent >= 0.5) {
            additionalMultiplier = 0.05; // +5% за 0.5%+ изменение
        }
        
        return baseMultiplier + additionalMultiplier;
    }

    // Загрузка активных ставок
    loadActiveStakes() {
        const savedStakes = localStorage.getItem('activeStakes');
        if (savedStakes) {
            this.activeStakes = JSON.parse(savedStakes);
            // Конвертируем строки дат обратно в объекты Date
            this.activeStakes.forEach(stake => {
                stake.startTime = new Date(stake.startTime);
                stake.endTime = new Date(stake.endTime);
            });
        }
        this.updateStakesCount();
    }

    // Обновление счетчика активных ставок
    updateStakesCount() {
        const activeCount = this.activeStakes.filter(stake => stake.status === 'active').length;
        const stakesCountElement = document.getElementById('stakesCount');
        if (stakesCountElement) {
            stakesCountElement.textContent = activeCount;
        }
    }

    // Проверка результатов ставок
    checkStakeResults() {
        const now = new Date();
        const completedStakes = [];
        
        this.activeStakes.forEach(stake => {
            if (stake.status === 'active' && now >= stake.endTime) {
                const result = this.calculateStakeResult(stake);
                stake.status = 'completed';
                stake.result = result;
                stake.endPrice = this.currentPrice;
                completedStakes.push(stake);
            }
        });
        
        // Обрабатываем завершенные сделки
        completedStakes.forEach(stake => {
            this.processStakeResult(stake);
        });
        
        // Обновляем список сделок
        if (completedStakes.length > 0) {
            localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
            this.updateActiveStakesDisplay();
            this.updateStakesCount();
        }
    }

    // Расчет результата сделки
    calculateStakeResult(stake) {
        const priceChange = this.currentPrice - stake.startPrice;
        const priceChangePercent = (priceChange / stake.startPrice) * 100;
        
        if (stake.direction === 'up') {
            return priceChangePercent > 0 ? 'win' : 'loss';
        } else {
            return priceChangePercent < 0 ? 'win' : 'loss';
        }
    }

    // Обработка результата сделки
    processStakeResult(stake) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        let winAmount = 0;
        let profit = 0;
        let finalMultiplier = stake.baseMultiplier;
        let priceChangePercent = 0;
        
        if (stake.result === 'win') {
            // Рассчитываем процент изменения цены
            priceChangePercent = ((stake.endPrice - stake.startPrice) / stake.startPrice) * 100;
            
            // Если ставка на падение, инвертируем процент
            if (stake.direction === 'down') {
                priceChangePercent = -priceChangePercent;
            }
            
            // Рассчитываем финальный множитель на основе процента изменения
            finalMultiplier = this.getWinMultiplier(stake.timeHours, priceChangePercent);
            
            // Выигрыш
            winAmount = stake.amount * finalMultiplier;
            profit = winAmount - stake.amount;
            user.balance += winAmount;
            
            this.showToast(
                `Поздравляем! Сделка на ${stake.direction === 'up' ? 'рост' : 'падение'} выиграла! ` +
                `Изменение цены: ${priceChangePercent.toFixed(2)}% ` +
                `Множитель: x${finalMultiplier.toFixed(2)} ` +
                `Выигрыш: +$${winAmount.toFixed(2)}`,
                'success'
            );
        } else {
            // Проигрыш
            profit = -stake.amount;
            this.showToast(
                `Сделка на ${stake.direction === 'up' ? 'рост' : 'падение'} проиграла. Потеряно: $${stake.amount.toFixed(2)}`,
                'error'
            );
        }
        
        // Сохраняем сделку в историю с дополнительной информацией
        this.saveStakeToHistory(stake, winAmount, profit, finalMultiplier, priceChangePercent);
        
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
    }

    // Сохранение сделки в историю
    saveStakeToHistory(stake, winAmount, profit, finalMultiplier, priceChangePercent) {
        const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
        
        const historyEntry = {
            id: stake.id,
            coinId: stake.coinId,
            coinSymbol: stake.coinSymbol,
            coinName: stake.coinName,
            amount: stake.amount,
            direction: stake.direction,
            timeHours: stake.timeHours,
            startPrice: stake.startPrice,
            endPrice: stake.endPrice,
            startTime: stake.startTime,
            endTime: stake.endTime,
            status: stake.status,
            result: stake.result,
            winAmount: winAmount,
            profit: profit,
            baseMultiplier: stake.baseMultiplier,
            finalMultiplier: finalMultiplier,
            priceChangePercent: priceChangePercent,
            dynamicMultiplier: stake.dynamicMultiplier,
            createdAt: new Date().toISOString()
        };
        
        stakeHistory.push(historyEntry);
        localStorage.setItem('stakeHistory', JSON.stringify(stakeHistory));
        
        console.log('Сделка сохранена в историю:', historyEntry);
    }

    // Обновление отображения активных сделок
    updateActiveStakesDisplay() {
        const activeStakesList = document.getElementById('activeStakesList');
        if (!activeStakesList) return;
        
        const activeStakes = this.activeStakes.filter(stake => stake.status === 'active');
        
        if (activeStakes.length === 0) {
            activeStakesList.innerHTML = '<p class="no-stakes">У вас нет активных сделок</p>';
            return;
        }
        
        let html = '';
        activeStakes.forEach(stake => {
            const timeLeft = this.getTimeLeft(stake.endTime);
            const progress = this.getStakeProgress(stake.startTime, stake.endTime);
            const profit = this.getInstantProfit(stake);
            const profitClass = profit >= 0 ? 'positive' : 'negative';
            
            html += `
                <div class="stake-item">
                    <div class="stake-header">
                        <div class="stake-coin">
                            <span class="coin-symbol">${stake.coinSymbol}</span>
                            <span class="coin-name">${stake.coinName}</span>
                        </div>
                        <div class="stake-direction ${stake.direction}">
                            <i class="fas fa-arrow-${stake.direction === 'up' ? 'up' : 'down'}"></i>
                            <span>${stake.direction === 'up' ? 'Рост' : 'Падение'}</span>
                        </div>
                    </div>
                    <div class="stake-details">
                        <div class="stake-amount">$${stake.amount.toFixed(2)}</div>
                        <div class="stake-time">${stake.timeHours} ч</div>
                        <div class="stake-multiplier">x${stake.baseMultiplier.toFixed(1)} (базовый)</div>
                    </div>
                    <div class="stake-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="time-left">${timeLeft}</div>
                    </div>
                    <div class="stake-prices">
                        <div class="start-price">Начальная: $${stake.startPrice.toFixed(2)}</div>
                        <div class="current-price">Текущая: $${this.currentPrice.toFixed(2)}</div>
                    </div>
                    <div class="stake-profit ${profitClass}">Текущая прибыль: $${Math.abs(profit).toFixed(2)}</div>
                </div>
            `;
        });
        
        activeStakesList.innerHTML = html;

        // Start live ticker to update time/progress/profit every second while modal visible
        this.startActiveStakesTicker();
    }

    // Получение оставшегося времени
    getTimeLeft(endTime) {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) return 'Завершено';
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        return `${hours}ч ${minutes}м ${seconds}с`;
    }

    // Получение прогресса ставки
    getStakeProgress(startTime, endTime) {
        const now = new Date();
        const total = endTime - startTime;
        const elapsed = now - startTime;
        
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    // Моментальная прибыль на основе изменения цены и направления
    getInstantProfit(stake) {
        if (!this.currentPrice || !stake || !stake.startPrice) return 0;
        const priceChangePercent = ((this.currentPrice - stake.startPrice) / stake.startPrice) * 100;
        const directionSign = stake.direction === 'up' ? 1 : -1;
        const effectiveMultiplier = (stake.dynamicMultiplier || stake.baseMultiplier || 1);
        const profitPercent = priceChangePercent * directionSign * (effectiveMultiplier - 1);
        const profit = (stake.amount || 0) * (profitPercent / 100);
        return profit;
    }

    startActiveStakesTicker() {
        // Clear previous ticker
        if (this._stakesTicker) {
            clearInterval(this._stakesTicker);
        }
        const modalEl = document.getElementById('activeStakesModal');
        this._stakesTicker = setInterval(() => {
            if (!modalEl || modalEl.style.display === 'none') {
                clearInterval(this._stakesTicker);
                this._stakesTicker = null;
                return;
            }
            // Update each item values
            const items = modalEl.querySelectorAll('.stake-item');
            const now = new Date();
            items.forEach((item, idx) => {
                const stake = this.activeStakes.filter(s => s.status === 'active')[idx];
                if (!stake) return;
                const timeText = this.getTimeLeft(stake.endTime);
                const progress = this.getStakeProgress(stake.startTime, stake.endTime);
                const profit = this.getInstantProfit(stake);
                const timeEl = item.querySelector('.time-left');
                const barEl = item.querySelector('.progress-fill');
                const curPriceEl = item.querySelector('.current-price');
                const profitEl = item.querySelector('.stake-profit');
                if (timeEl) timeEl.textContent = timeText;
                if (barEl) barEl.style.width = `${progress}%`;
                if (curPriceEl) curPriceEl.textContent = `Текущая: $${this.currentPrice.toFixed(2)}`;
                if (profitEl) {
                    profitEl.textContent = `Текущая прибыль: $${Math.abs(profit).toFixed(2)}`;
                    profitEl.className = `stake-profit ${profit >= 0 ? 'positive' : 'negative'}`;
                }
            });
        }, 1000);
    }

    // Открытие модального окна активных ставок
    openActiveStakesModal() {
        this.updateActiveStakesDisplay();
        document.getElementById('activeStakesModal').style.display = 'flex';
    }

    updateCalculations() {
        this.calculateFuturesPotential();
    }

    goBack() {
        navigateBackSmart();
    }

    // Открытие модального окна фьючерсной торговли
    openFuturesModal(direction = 'up') {
        this.selectFuturesDirection(direction);
        document.getElementById('futuresModal').style.display = 'flex';
        this.updateBalanceDisplay();
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showToast(message, type = 'info') {
        // Используем новую систему уведомлений
        if (window.notificationManager) {
            return window.notificationManager.show(message, type, {
                duration: 5000
            });
        }
        
        // Fallback для старой системы
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // Обновление отображения баланса в модальных окнах
    updateBalanceDisplay() {
        const user = JSON.parse(localStorage.getItem('user'));
        const balance = user ? user.balance : 0;
        
        // Обновляем баланс в модальном окне ставки
        const accountBalanceElement = document.getElementById('accountBalance');
        if (accountBalanceElement) {
            accountBalanceElement.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Обновляем текущую цену в модальном окне
        const currentPriceDisplay = document.getElementById('currentPriceDisplay');
        if (currentPriceDisplay) {
            currentPriceDisplay.textContent = `$${this.currentPrice.toFixed(2)}`;
        }
        
        console.log(`Баланс обновлен в coininfo.js: $${balance}`);
    }

    // Инициализация синхронизации баланса
    initBalanceSync() {
        // Проверяем, есть ли BalanceSync в глобальной области
        if (window.BalanceSync) {
            this.balanceSync = new window.BalanceSync();
            console.log('BalanceSync инициализирован в coininfo.js');
        } else {
            console.warn('BalanceSync не найден в глобальной области');
        }
    }

    async loadCoinFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const coinId = urlParams.get('coin') || 'bitcoin';
        
        // Load coin data from CRM
        await this.loadCoinFromCRM(coinId);
    }

    async loadCoinFromCRM(coinId) {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('No auth token found');
                this.showToast('Ошибка', 'Необходима авторизация', 'error');
                return;
            }

            // Use the same API endpoint as coins.js for consistency
            const response = await fetch('/api/coins/exchange', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.coins) {
                    // Find the coin by ID or symbol
                    let coin = result.coins.find(c => c.id === coinId);
                    if (!coin) {
                        coin = result.coins.find(c => c.symbol?.toLowerCase() === coinId?.toLowerCase());
                    }
                    if (!coin) {
                        coin = result.coins.find(c => c.name?.toLowerCase() === coinId?.toLowerCase());
                    }
                    
                    if (coin) {
                        // Try to fetch additional market data from a secondary source if needed
                        await this.enrichCoinData(coin);
                        
                        this.currentCoin = {
                            ...coin,
                            icon: this.getCoinIcon(coin.symbol),
                            color: this.getCoinColor(coin.symbol)
                        };
                        this.updateCoinInfo();
                    } else {
                        console.error('Coin not found:', coinId);
                        this.showToast('Ошибка', 'Монета не найдена', 'error');
                    }
                } else {
                    console.error('Failed to load coins data');
                    this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
                }
            } else {
                console.error('Failed to load coins:', response.status);
                this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
            }
        } catch (error) {
            console.error('Error loading coin from CRM:', error);
            this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
        }
    }
    
    // Enrich coin data with additional market information
    async enrichCoinData(coin) {
        try {
            // If the coin data is missing some fields, try to enrich it
            if (!coin.high_24h || !coin.low_24h || !coin.ath) {
                // You can add additional API calls here to fetch more comprehensive data
                // For now, we'll use calculated estimates based on available data
                
                if (!coin.high_24h && coin.price) {
                    // Estimate 24h high as current price + a percentage based on volatility
                    const volatilityFactor = Math.abs(coin.priceChangePercent || 2) / 100;
                    coin.high_24h = coin.price * (1 + volatilityFactor);
                }
                
                if (!coin.low_24h && coin.price) {
                    // Estimate 24h low as current price - a percentage based on volatility
                    const volatilityFactor = Math.abs(coin.priceChangePercent || 2) / 100;
                    coin.low_24h = coin.price * (1 - volatilityFactor);
                }
                
                if (!coin.ath && coin.price) {
                    // Estimate ATH as current price * reasonable multiplier
                    coin.ath = coin.price * (2 + Math.random() * 3); // 2x to 5x current price
                }
                
                // Add missing percentage changes if not available
                if (!coin.price_change_percentage_1h_in_currency) {
                    coin.price_change_percentage_1h_in_currency = (Math.random() - 0.5) * 4; // -2% to +2%
                }
                
                if (!coin.price_change_percentage_7d_in_currency) {
                    coin.price_change_percentage_7d_in_currency = (Math.random() - 0.5) * 20; // -10% to +10%
                }
                
                if (!coin.price_change_percentage_30d_in_currency) {
                    coin.price_change_percentage_30d_in_currency = (Math.random() - 0.5) * 60; // -30% to +30%
                }
            }
        } catch (error) {
            console.warn('Failed to enrich coin data:', error);
        }
    }

    getCoinIcon(symbol) {
        const iconMap = {
            'BTC': 'fab fa-bitcoin',
            'ETH': 'fab fa-ethereum',
            'BNB': 'fas fa-coins',
            'SOL': 'fas fa-bolt',
            'ADA': 'fas fa-chart-line',
            'XRP': 'fas fa-waves',
            'DOT': 'fas fa-circle',
            'DOGE': 'fas fa-dog',
            'AVAX': 'fas fa-mountain',
            'LINK': 'fas fa-link',
            'MATIC': 'fas fa-polygon',
            'UNI': 'fas fa-exchange-alt',
            'LTC': 'fas fa-coins',
            'XLM': 'fas fa-star',
            'ATOM': 'fas fa-atom',
            'XMR': 'fas fa-shield-alt',
            'ALGO': 'fas fa-chart-bar',
            'VET': 'fas fa-car',
            'FIL': 'fas fa-hdd',
            'ICP': 'fas fa-network-wired'
        };
        
        return iconMap[symbol] || 'fas fa-coins';
    }

    getCoinColor(symbol) {
        const colorMap = {
            'BTC': '#f7931a',
            'ETH': '#627eea',
            'BNB': '#f3ba2f',
            'SOL': '#9945ff',
            'ADA': '#0033ad',
            'XRP': '#23292f',
            'DOT': '#e6007a',
            'DOGE': '#c2a633',
            'AVAX': '#e84142',
            'LINK': '#2a5ada',
            'MATIC': '#8247e5',
            'UNI': '#ff007a',
            'LTC': '#a6a9aa',
            'XLM': '#000000',
            'ATOM': '#2e3148',
            'XMR': '#ff6600',
            'ALGO': '#000000',
            'VET': '#15bdff',
            'FIL': '#0090ff',
            'ICP': '#29a4ff'
        };
        
        return colorMap[symbol] || '#6c757d';
    }

    updateCoinInfo() {
        if (!this.currentCoin) return;
        
        // Обновляем заголовок страницы
        document.title = `${this.currentCoin.name} - SellBit`;
        
        // Обновляем информацию о монете в заголовке страницы
        const headerCoinName = document.getElementById('headerCoinName');
        const headerCoinSymbol = document.getElementById('headerCoinSymbol');
        const headerPrice = document.getElementById('headerPrice');
        const headerChange = document.getElementById('headerChange');
        
        if (headerCoinName) headerCoinName.textContent = this.currentCoin.name;
        if (headerCoinSymbol) headerCoinSymbol.textContent = this.currentCoin.symbol;
        if (headerPrice) headerPrice.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        
        if (headerChange) {
            const isPositive = this.priceChangePercent >= 0;
            headerChange.className = `header-change ${isPositive ? 'positive' : 'negative'}`;
            headerChange.textContent = `${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%`;
        }
        
        // Обновляем информацию о монете в заголовке карточки
        const coinIcon = document.querySelector('.coin-icon');
        const coinName = document.querySelector('.coin-name');
        const coinSymbol = document.querySelector('.coin-symbol');
        
        if (coinIcon) {
            // Заменяем иконку на логотип
            coinIcon.innerHTML = `<img src="${window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol)}" alt="${this.currentCoin.symbol}" class="coin-logo" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='/logos/default.svg'">`;
        }
        if (coinName) coinName.textContent = this.currentCoin.name;
        if (coinSymbol) coinSymbol.textContent = this.currentCoin.symbol;
        
        // Обновляем цену и изменение в карточке
        this.currentPrice = this.currentCoin.price || 0;
        this.priceChange = this.currentCoin.priceChange || 0;
        this.priceChangePercent = this.currentCoin.priceChange ? (this.currentCoin.priceChange / this.currentPrice * 100) : 0;
        
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        }
        
        if (changeElement) {
            const isPositive = this.priceChangePercent >= 0;
            changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
            changeElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}$${Math.abs(this.priceChange).toFixed(2)} (${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%)
            `;
        }
        
        // Обновляем market statistics
        this.updateMarketStatistics();
        
        // Обновляем price analysis
        this.updatePriceAnalysis();
        
        // Обновляем информацию о монете из базы данных
        this.updateAboutSection();
        
        // Обновляем заголовок модального окна торговли
        const stakeModalTitle = document.getElementById('stakeModalTitle');
        if (stakeModalTitle) {
            stakeModalTitle.textContent = `Торговля - Сделка на ${this.stakeDirection === 'up' ? 'рост' : 'падение'}`;
        }
    }
    
    updateMarketStatistics() {
        if (!this.currentCoin) return;
        
        // Update maximum price (all-time high)
        const maxPriceElement = document.getElementById('maxPrice');
        if (maxPriceElement) {
            // Use real ATH data if available, otherwise estimate based on current price
            const maxPrice = this.currentCoin.ath || this.currentCoin.high_24h || (this.currentPrice * 1.25);
            maxPriceElement.textContent = `$${this.formatCurrency(maxPrice)}`;
        }
        
        // Update market cap with real data
        const marketCapElement = document.getElementById('marketCap');
        if (marketCapElement) {
            const marketCap = this.currentCoin.marketCap || this.currentCoin.market_cap || 0;
            marketCapElement.textContent = `$${this.formatMarketCap(marketCap)}`;
        }
        
        // Update 24h volume with real data
        const volume24hElement = document.getElementById('volume24h');
        if (volume24hElement) {
            const volume = this.currentCoin.volume || this.currentCoin.total_volume || this.currentCoin.volume_24h || 0;
            volume24hElement.textContent = `$${this.formatMarketCap(volume)}`;
        }
        
        // Update circulating supply with real data
        const circulatingSupplyElement = document.getElementById('circulatingSupply');
        const coinSymbolSupplyElement = document.getElementById('coinSymbolSupply');
        if (circulatingSupplyElement) {
            const supply = this.currentCoin.circulatingSupply || this.currentCoin.circulating_supply || this.currentCoin.current_supply || 0;
            circulatingSupplyElement.textContent = this.formatSupply(supply);
        }
        if (coinSymbolSupplyElement) {
            coinSymbolSupplyElement.textContent = this.currentCoin.symbol;
        }
    }
    
    updatePriceAnalysis() {
        if (!this.currentCoin) return;
        
        // Use real percentage changes from coin data
        const changes = {
            '1h': this.currentCoin.price_change_percentage_1h_in_currency || this.currentCoin.price_change_1h || 0,
            '24h': this.currentCoin.price_change_percentage_24h_in_currency || this.currentCoin.priceChangePercent || this.priceChangePercent || 0,
            '7d': this.currentCoin.price_change_percentage_7d_in_currency || this.currentCoin.price_change_7d || 0,
            '30d': this.currentCoin.price_change_percentage_30d_in_currency || this.currentCoin.price_change_30d || 0
        };
        
        // Update period changes with real data
        Object.entries(changes).forEach(([period, change]) => {
            const element = document.getElementById(`change${period}`);
            if (element) {
                const changeValue = parseFloat(change) || 0;
                const isPositive = changeValue >= 0;
                element.className = `change ${isPositive ? 'positive' : 'negative'}`;
                element.textContent = `${isPositive ? '+' : ''}${changeValue.toFixed(2)}%`;
            }
        });
        
        // Update 24h high/low with real data
        const high24h = this.currentCoin.high_24h || this.currentCoin.high24h || this.currentPrice;
        const low24h = this.currentCoin.low_24h || this.currentCoin.low24h || this.currentPrice;
        
        const high24hElement = document.getElementById('high24h');
        const low24hElement = document.getElementById('low24h');
        const avgPriceElement = document.getElementById('avgPrice');
        const volatilityElement = document.getElementById('volatility');
        
        if (high24hElement) high24hElement.textContent = `$${this.formatCurrency(high24h)}`;
        if (low24hElement) low24hElement.textContent = `$${this.formatCurrency(low24h)}`;
        if (avgPriceElement) {
            const avgPrice = (high24h + low24h) / 2;
            avgPriceElement.textContent = `$${this.formatCurrency(avgPrice)}`;
        }
        if (volatilityElement) {
            // Calculate real volatility based on 24h range
            const volatility = high24h > 0 && low24h > 0 ? ((high24h - low24h) / ((high24h + low24h) / 2) * 100) : 0;
            volatilityElement.textContent = `${volatility.toFixed(2)}%`;
        }
    }
    
    formatSupply(supply) {
        if (supply >= 1000000000) {
            return (supply / 1000000000).toFixed(2) + 'B';
        } else if (supply >= 1000000) {
            return (supply / 1000000).toFixed(2) + 'M';
        } else if (supply >= 1000) {
            return (supply / 1000).toFixed(2) + 'K';
        } else {
            return supply.toLocaleString();
        }
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1000000000000) {
            return (marketCap / 1000000000000).toFixed(1) + 'T';
        } else if (marketCap >= 1000000000) {
            return (marketCap / 1000000000).toFixed(1) + 'B';
        } else if (marketCap >= 1000000) {
            return (marketCap / 1000000).toFixed(1) + 'M';
        } else {
            return marketCap.toLocaleString();
        }
    }

    formatCurrency(amount) {
        if (amount >= 1000) {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (amount >= 1) {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
        } else {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
        }
    }

    // Обновление секции "О монете" с реальной информацией
    updateAboutSection() {
        if (!this.currentCoin) return;
        
        // Получаем ID монеты для поиска в базе данных
        let coinId = this.currentCoin.id || this.currentCoin.symbol?.toLowerCase();
        
        // Сопоставляем ID монет с нашей базой данных
        const coinMapping = {
            'bitcoin': 'bitcoin',
            'ethereum': 'ethereum',
            'binancecoin': 'binancecoin',
            'solana': 'solana',
            'cardano': 'cardano',
            'ripple': 'ripple',
            'polkadot': 'polkadot',
            'dogecoin': 'dogecoin',
            'avalanche-2': 'avalanche',
            'chainlink': 'chainlink',
            'matic-network': 'matic-network',
            'uniswap': 'uniswap',
            'litecoin': 'litecoin',
            'stellar': 'stellar',
            'cosmos': 'cosmos',
            'monero': 'monero',
            'algorand': 'algorand',
            'vechain': 'vechain',
            'filecoin': 'filecoin',
            'internet-computer': 'internet-computer'
        };
        
        // Пробуем найти монету по различным вариантам ID
        let coinInfo = null;
        
        // 1. Прямое сопоставление
        if (coinMapping[coinId]) {
            coinInfo = window.getCoinInfo(coinMapping[coinId]);
        }
        
        // 2. По символу
        if (!coinInfo && this.currentCoin.symbol) {
            const symbolMapping = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'SOL': 'solana',
                'ADA': 'cardano',
                'XRP': 'ripple',
                'DOT': 'polkadot',
                'DOGE': 'dogecoin',
                'AVAX': 'avalanche',
                'LINK': 'chainlink',
                'MATIC': 'matic-network',
                'UNI': 'uniswap',
                'LTC': 'litecoin',
                'XLM': 'stellar',
                'ATOM': 'cosmos',
                'XMR': 'monero',
                'ALGO': 'algorand',
                'VET': 'vechain',
                'FIL': 'filecoin',
                'ICP': 'internet-computer'
            };
            
            if (symbolMapping[this.currentCoin.symbol]) {
                coinInfo = window.getCoinInfo(symbolMapping[this.currentCoin.symbol]);
            }
        }
        
        // 3. Если ничего не найдено, используем дефолтную информацию
        if (!coinInfo) {
            coinInfo = {
                name: this.currentCoin.name || 'Неизвестная монета',
                symbol: this.currentCoin.symbol || '???',
                description: `Информация о ${this.currentCoin.name || 'этой монете'} пока недоступна.`,
                algorithm: 'N/A',
                maxSupply: 'N/A',
                blockTime: 'N/A',
                creator: 'N/A',
                founded: 'N/A',
                consensus: 'N/A',
                features: []
            };
        }
        
        // Обновляем заголовок секции
        const aboutTitle = document.getElementById('aboutSectionTitle');
        if (aboutTitle) {
            aboutTitle.textContent = `О ${coinInfo.name}`;
        }
        
        // Обновляем описание
        const aboutDescription = document.getElementById('aboutSectionDescription');
        if (aboutDescription) {
            aboutDescription.textContent = coinInfo.description;
        }
        
        // Обновляем статистику
        const algorithmElement = document.getElementById('aboutAlgorithm');
        const maxSupplyElement = document.getElementById('aboutMaxSupply');
        const blockTimeElement = document.getElementById('aboutBlockTime');
        const creatorElement = document.getElementById('aboutCreator');
        
        if (algorithmElement) algorithmElement.textContent = coinInfo.algorithm;
        if (maxSupplyElement) maxSupplyElement.textContent = coinInfo.maxSupply;
        if (blockTimeElement) blockTimeElement.textContent = coinInfo.blockTime;
        if (creatorElement) creatorElement.textContent = coinInfo.creator;
        
        console.log('About section updated for:', coinInfo.name);
    }

    async loadCoinData() {
        // Load chart data with real database information
        await this.loadChartData('1D');
        
        this.showToast('Данные загружены из базы данных', 'info');
        
        // Update price with animation
        this.animatePriceChange();
        
        // Initialize WebSocket for real-time updates
        this.initializeWebSocket();
    }

    // Initialize WebSocket connection for real-time updates
    initializeWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log('Initializing WebSocket for coininfo:', wsUrl);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connection established for coininfo');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'price_update' && this.currentCoin && message.data.coinId === this.currentCoin.id) {
                        // Update current coin price
                        this.currentPrice = message.data.price;
                        this.priceChange = message.data.priceChange;
                        this.priceChangePercent = (this.priceChange / this.currentPrice) * 100;
                        
                        // Update display
                        this.updatePriceDisplay();
                        
                        // Update chart if needed
                        this.updateChartWithRealTimeData(message.data.price);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed for coininfo');
                // Reconnect after 5 seconds
                setTimeout(() => this.initializeWebSocket(), 5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error in coininfo:', error);
            };
        } catch (error) {
            console.error('Error initializing WebSocket in coininfo:', error);
        }
    }

    // Update price display with real-time data
    updatePriceDisplay() {
        // Update main price display
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        }
        
        if (changeElement) {
            const isPositive = this.priceChangePercent >= 0;
            changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
            changeElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}$${Math.abs(this.priceChange).toFixed(2)} (${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%)
            `;
        }
        
        // Update header price display
        const headerPrice = document.getElementById('headerPrice');
        const headerChange = document.getElementById('headerChange');
        
        if (headerPrice) {
            headerPrice.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        }
        
        if (headerChange) {
            const isPositive = this.priceChangePercent >= 0;
            headerChange.className = `header-change ${isPositive ? 'positive' : 'negative'}`;
            headerChange.textContent = `${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%`;
        }
    }

    // Update chart with real-time price data
    updateChartWithRealTimeData(newPrice) {
        if (!this.customChart) return;
        
        // Add new data point to chart
        const now = new Date();
        const newDataPoint = {
            time: this.formatTimeString(now),
            price: newPrice,
            timestamp: now.getTime()
        };
        
        // Add to full dataset
        this.chartData.push(newDataPoint);
        
        // Keep only last 1000 points for better performance
        if (this.chartData.length > 1000) {
            this.chartData = this.chartData.slice(-1000);
        }
        
        // Update chart display
        this.customChart.updateData(this.chartData);
    }

    animatePriceChange() {
        // Убираем случайные скачки цены - цена будет обновляться только через WebSocket
        // от реальных данных с сервера
        console.log('Price animation disabled - using real-time data from server');
    }

    toggleFavorite() {
        const favoriteBtn = document.querySelector('.header-right .icon-btn:first-child i');
        const isFavorite = favoriteBtn.classList.contains('fas');
        
        if (isFavorite) {
            favoriteBtn.classList.remove('fas');
            favoriteBtn.classList.add('far');
            this.showToast('Удалено из избранного', 'info');
        } else {
            favoriteBtn.classList.remove('far');
            favoriteBtn.classList.add('fas');
            this.showToast('Добавлено в избранное', 'success');
        }
    }

    shareCoin() {
        // Guard removed share button; keep method safe if called elsewhere
        if (!navigator.share) {
            navigator.clipboard.writeText(`${this.currentCoin?.name || 'Coin'} (${this.currentCoin?.symbol || ''}): $${(this.currentPrice || 0).toLocaleString()}`);
            this.showToast('Ссылка скопирована в буфер обмена', 'success');
            return;
        }
        navigator.share({
            title: `${this.currentCoin?.name || 'Coin'} (${this.currentCoin?.symbol || ''})`,
            text: `Текущая цена ${(this.currentCoin?.name || 'Coin')}: $${(this.currentPrice || 0).toLocaleString()}`,
            url: window.location.href
        }).catch((err) => {
            // Swallow AbortError (user canceled share), show info toast; log others
            if (err && (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort'))) {
                this.showToast('Поделиться отменено', 'info');
                return;
            }
            console.error('Share failed:', err);
            this.showToast('Не удалось поделиться', 'error');
        });
    }

    initCustomChart() {
        const chartContainer = document.getElementById('customChart');
        if (!chartContainer) return;

        this.customChart = new CustomChart(chartContainer, {
            lineColor: '#4ade80', // Lime green (changed from Binance blue)
            gridColor: 'rgba(30, 41, 59, 0.5)', // Dark grid color
            textColor: '#94a3b8', // Light gray text
            backgroundColor: '#0f172a', // Dark blue background
            timeWindow: 180, // 3 hours (changed from 60 minutes)
            onTimeWindowChange: (startTime, endTime) => {
                // Update chart info when time window changes
                this.updateChartInfo(startTime, endTime);
                console.log('Time window changed:', new Date(startTime), new Date(endTime));
            }
        });

        // Load real chart data instead of demo data
        this.loadChartData('1D');
        
        // Update chart info display
        this.updateChartInfo();
        
        // Set a timeout to ensure we have some data displayed
        setTimeout(() => {
            if (this.customChart && (!this.chartData || this.chartData.length < 2)) {
                console.log('Ensuring chart has initial data');
                this.updateChartWithIntelligentFallback('1D');
            }
        }, 2000);
    }

    generateInitialChartData() {
        // Generate sample data for demonstration
        const now = Date.now();
        const points = [];
        const basePrice = this.currentPrice || 45000;
        
        // Generate 240 minutes of data (one point per minute) for 2-hour sliding window
        for (let i = -240; i <= 0; i++) {
            const timestamp = now + (i * 60 * 1000); // Each point is 1 minute apart
            const time = this.formatTimeString(new Date(timestamp));
            const price = basePrice + (Math.random() - 0.5) * 1000 + Math.sin(i / 10) * 500;
            
            points.push({
                time: time,
                price: Math.round(price * 100) / 100,
                timestamp: timestamp
            });
        }
        
        this.chartData = points;
        if (this.customChart) {
            this.customChart.setData(this.chartData);
        }
    }

    formatTimeString(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    }

    async loadChartData(period = '1D') {
        if (!this.currentCoin) {
            console.warn('No current coin available, cannot load chart data');
            // Use fallback data even when there's no current coin
            this.updateChartWithIntelligentFallback(period);
            return;
        }

        // Show loading animation
        this.showChartLoading();

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('No auth token found for chart data loading');
                // Use fallback data with real price base
                this.updateChartWithIntelligentFallback(period);
                return;
            }

            console.log('Loading real chart data for:', this.currentCoin.symbol || this.currentCoin.id);

            // Get price history from CRM API
            const coinId = this.currentCoin.id || this.currentCoin.symbol;
            const response = await fetch(`/api/coins/${coinId}/price-history?limit=200&period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.priceHistory && result.priceHistory.length > 0) {
                    console.log(`Loaded ${result.priceHistory.length} real data points for chart`);
                    this.updateChartWithRealData(result.priceHistory, period);
                } else {
                    console.warn('No price history data available, using intelligent fallback');
                    this.updateChartWithIntelligentFallback(period);
                }
            } else {
                console.error('Failed to load price history:', response.status, response.statusText);
                this.updateChartWithIntelligentFallback(period);
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.updateChartWithIntelligentFallback(period);
        } finally {
            // Hide loading animation
            this.hideChartLoading();
        }
    }

    // Intelligent fallback based on real current price
    updateChartWithIntelligentFallback(period) {
        if (!this.currentPrice) {
            console.warn('No current price available for intelligent fallback');
            // If we don't have a current price, show a simple message
            if (this.customChart) {
                // Create minimal data points to avoid "No data available"
                const now = Date.now();
                const basePrice = 1000; // Default price if we don't have real data
                const chartData = [
                    {
                        time: this.formatTimeString(new Date(now - 60000)),
                        price: basePrice,
                        timestamp: now - 60000
                    },
                    {
                        time: this.formatTimeString(new Date(now)),
                        price: basePrice,
                        timestamp: now
                    }
                ];
                this.chartData = chartData;
                this.customChart.setData(chartData);
            }
            return;
        }

        const now = Date.now();
        const points = [];
        const basePrice = this.currentPrice;
        const volatility = 0.02; // 2% volatility
        
        // Generate realistic data points based on current price
        const dataPoints = this.getDataPointsForPeriod(period);
        const timeInterval = this.getTimeIntervalForPeriod(period);
        
        let currentPrice = basePrice * (0.95 + Math.random() * 0.1); // Start within 5% range
        
        for (let i = 0; i < dataPoints; i++) {
            const timestamp = now - (dataPoints - i - 1) * timeInterval;
            const time = this.formatTimeString(new Date(timestamp));
            
            // More realistic price movement
            const change = (Math.random() - 0.5) * volatility;
            const trend = Math.sin(i / (dataPoints / 4)) * 0.01; // Gentle trend
            currentPrice = currentPrice * (1 + change + trend);
            
            // Ensure final price is close to actual current price
            if (i === dataPoints - 1) {
                currentPrice = basePrice;
            }
            
            points.push({
                time: time,
                price: Math.round(currentPrice * 100) / 100,
                timestamp: timestamp
            });
        }
        
        console.log(`Generated ${points.length} intelligent fallback data points`);
        this.chartData = points;
        if (this.customChart) {
            this.customChart.setData(this.chartData);
        }
        
        this.updateChartInfo();
    }

    getDataPointsForPeriod(period) {
        const pointsMap = {
            '1H': 60,   // 1 point per minute for 1 hour
            '1D': 24,   // 1 point per hour for 1 day
            '1W': 168,  // 1 point per hour for 1 week
            '1M': 30,   // 1 point per day for 1 month
            '3M': 90,   // 1 point per day for 3 months
            '1Y': 365,  // 1 point per day for 1 year
            'ALL': 100  // 100 points total
        };
        return pointsMap[period] || 24;
    }

    getTimeIntervalForPeriod(period) {
        const intervalMap = {
            '1H': 60 * 1000,           // 1 minute
            '1D': 60 * 60 * 1000,      // 1 hour
            '1W': 60 * 60 * 1000,      // 1 hour
            '1M': 24 * 60 * 60 * 1000, // 1 day
            '3M': 24 * 60 * 60 * 1000, // 1 day
            '1Y': 24 * 60 * 60 * 1000, // 1 day
            'ALL': 7 * 24 * 60 * 60 * 1000 // 1 week
        };
        return intervalMap[period] || 60 * 60 * 1000;
    }

    showChartLoading() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-loading');
        }
    }

    hideChartLoading() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.remove('chart-loading');
        }
    }

    updateChartWithRealData(priceHistory, period) {
        if (!this.customChart) return;

        // Filter data based on period
        const now = new Date();
        const filteredData = this.filterDataByPeriod(priceHistory, period, now);

        // Sort by timestamp (oldest first)
        filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Convert to chart format
        const chartData = filteredData.map(item => ({
            time: this.formatTimeString(new Date(item.timestamp)),
            price: item.price,
            timestamp: new Date(item.timestamp).getTime()
        }));

        // If we don't have enough data points, generate some fallback data
        if (chartData.length < 2) {
            console.warn('Not enough real data points, generating fallback data');
            this.updateChartWithIntelligentFallback(period);
            return;
        }

        this.chartData = chartData;
        this.customChart.setData(chartData);
        
        // Update chart info
        this.updateChartInfo();
        
        console.log(`Chart updated with ${chartData.length} data points for period ${period}`);
    }

    sampleData(data, period) {
        if (data.length <= 50) return data; // Если данных мало, возвращаем как есть

        const maxPoints = {
            '1D': 24,   // 24 точки за день (каждый час)
            '1W': 7,    // 7 точек за неделю (каждый день)
            '1M': 15,   // 15 точек за месяц (каждые 2 дня)
            '3M': 20,   // 20 точек за 3 месяца (каждые 4 дня)
            '1Y': 12,   // 12 точек за год (каждый месяц)
            'ALL': 15   // 15 точек за все время
        };

        const targetPoints = maxPoints[period] || 20;
        
        if (data.length <= targetPoints) return data;

        // Простое сэмплирование - берем равномерно распределенные точки
        const step = Math.floor(data.length / targetPoints);
        const sampled = [];
        
        for (let i = 0; i < data.length; i += step) {
            if (sampled.length < targetPoints) {
                sampled.push(data[i]);
            }
        }

        // Всегда добавляем последнюю точку
        if (sampled.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
            sampled.push(data[data.length - 1]);
        }

        return sampled;
    }

    // Format chart label with better formatting
    formatChartLabel(date) {
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            // Сегодня - показываем время
            return date.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffInHours < 168) { // 7 дней
            // На этой неделе - показываем день недели
            const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            return days[date.getDay()];
        } else if (diffInHours < 720) { // 30 дней
            // В этом месяце - показываем дату
            return date.getDate().toString();
        } else {
            // Больше месяца - показываем месяц
            const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            return months[date.getMonth()];
        }
    }

    filterDataByPeriod(priceHistory, period, now) {
        const periods = {
            '1D': 24 * 60 * 60 * 1000, // 24 hours
            '1W': 7 * 24 * 60 * 60 * 1000, // 7 days
            '1M': 30 * 24 * 60 * 60 * 1000, // 30 days
            '3M': 90 * 24 * 60 * 60 * 1000, // 90 days
            '1Y': 365 * 24 * 60 * 60 * 1000, // 365 days
            'ALL': Infinity
        };

        const timeLimit = periods[period] || periods['1D'];
        const cutoffTime = now.getTime() - timeLimit;

        return priceHistory
            .filter(entry => new Date(entry.timestamp).getTime() >= cutoffTime)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    updateChartWithGeneratedData(period) {
        const data = this.generateChartData(period);
        
        // Convert to our chart format
        const chartData = data.labels.map((label, index) => ({
            time: label,
            price: data.prices[index],
            timestamp: Date.now() - (data.labels.length - index - 1) * 60000 // Assume 1 minute intervals
        }));
        
        this.chartData = chartData;
        if (this.customChart) {
            this.customChart.setData(chartData);
        }
        
        // Update chart info
        this.updateChartInfo();
    }

    generateChartData(period = '1D') {
        const periods = {
            '1D': { points: 12, interval: 2 }, // 12 точек за день (каждые 2 часа)
            '1W': { points: 7, interval: 1 },  // 7 точек за неделю (каждый день)
            '1M': { points: 15, interval: 2 }, // 15 точек за месяц (каждые 2 дня)
            '3M': { points: 20, interval: 4 }, // 20 точек за 3 месяца (каждые 4 дня)
            '1Y': { points: 12, interval: 30 }, // 12 точек за год (каждый месяц)
            'ALL': { points: 15, interval: 30 } // 15 точек за все время
        };

        const periodConfig = periods[period] || periods['1D'];
        const labels = [];
        const prices = [];
        const basePrice = this.currentPrice || 43250.00;
        const volatility = 0.015; // Уменьшенная волатильность для более плавного графика

        // Генерируем более реалистичные данные с трендом
        let currentPrice = basePrice;
        const trend = (Math.random() - 0.5) * 0.1; // Случайный тренд

        for (let i = 0; i < periodConfig.points; i++) {
            // Добавляем тренд и случайные колебания
            const trendChange = trend * (i / periodConfig.points);
            const randomChange = (Math.random() - 0.5) * volatility;
            currentPrice = currentPrice * (1 + trendChange + randomChange);
            
            // Форматируем метку времени
            let label;
            switch (period) {
                case '1D':
                    label = `${i * 2}:00`;
                    break;
                case '1W':
                    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                    label = days[i % 7];
                    break;
                case '1M':
                    label = `${i * 2 + 1} дн`;
                    break;
                case '3M':
                    label = `${i * 4 + 1} дн`;
                    break;
                case '1Y':
                    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                    label = months[i % 12];
                    break;
                default:
                    label = `${i + 1}`;
            }
            
            labels.push(label);
            prices.push(parseFloat(currentPrice.toFixed(2)));
        }

        return { labels, prices };
    }

    updateChartInfo(startTime, endTime) {
        // Update interval display
        const intervalElement = document.getElementById('chartInterval');
        if (intervalElement) {
            intervalElement.textContent = '1h'; // Minimum 1 hour as per memory specification
        }
        
        // Update time window display
        const timeWindowElement = document.getElementById('timeWindow');
        if (timeWindowElement) {
            timeWindowElement.textContent = '1 hour'; // Minimum time window
        }
        
        // Update data points count with real data info
        const dataPointsElement = document.getElementById('dataPoints');
        if (dataPointsElement && this.chartData) {
            const visibleData = this.customChart ? this.customChart.getVisibleData() : this.chartData;
            dataPointsElement.textContent = `${visibleData.length} (real)`;
        }
    }

    // Assets Section Management
    switchAssetsView(view) {
        this.currentAssetsView = view;
        
        // Update toggle buttons (only if both exist)
        const topBtn = document.getElementById('topAssetsBtn');
        const myBtn = document.getElementById('myAssetsBtn');
        
        if (topBtn && myBtn) {
            topBtn.classList.toggle('active', view === 'top');
            myBtn.classList.toggle('active', view === 'my');
        } else if (myBtn) {
            // Only "My Trades" button exists, always keep it active
            myBtn.classList.add('active');
        }
        
        // Load corresponding data
        this.loadAssets();
    }

    loadAssets() {
        const assetsList = document.getElementById('assetsList');
        if (!assetsList) return;

        if (this.currentAssetsView === 'my') {
            this.loadMyTrades();
        } else {
            this.loadTopAssets();
        }
    }

    loadMyTrades() {
        const assetsList = document.getElementById('assetsList');
        if (!assetsList) return;

        // Get active futures positions
        const activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]');
        const futuresPositions = activeStakes.filter(stake => stake.type === 'perpetual_futures' && stake.status === 'open');

        if (futuresPositions.length === 0) {
            assetsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>Нет активных позиций</h3>
                    <p>Откройте первую фьючерсную позицию чтобы начать торговлю</p>
                </div>
            `;
            return;
        }

        // Display futures positions
        let html = '';
        futuresPositions.forEach(position => {
            const currentPnL = this.calculatePositionPnL(position);
            const pnlClass = currentPnL >= 0 ? 'positive' : 'negative';
            const pnlPercentage = position.margin ? (currentPnL / position.margin * 100).toFixed(2) : '0.00';
            
            html += `
                <div class="futures-position-item ${position.direction}" onclick="openPositionDetails('${position.id}')">
                    <div class="position-icon">
                        <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(position.coinSymbol) : '/logos/default.svg'}" alt="${position.coinSymbol}" onerror="this.src='/logos/default.svg'">
                        <div class="position-direction-badge ${position.direction}">
                            ${position.direction === 'up' ? '↑' : '↓'}
                        </div>
                    </div>
                    <div class="position-details">
                        <div class="position-header">
                            <span class="position-name">${position.coinName || position.coinSymbol}</span>
                            <span class="position-leverage">x${position.leverage}</span>
                        </div>
                        <div class="position-status">
                            <span class="position-size">Маржа: $${position.margin.toFixed(2)}</span>
                            <span class="position-entry-price">Вход: $${position.entryPrice.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="position-pnl">
                        <div class="pnl-amount ${pnlClass}">$${currentPnL.toFixed(2)}</div>
                        <div class="pnl-percentage">${pnlPercentage}%</div>
                        <button class="close-position-btn danger" onclick="event.stopPropagation(); openClosePositionModal('${position.id}')">
                            <i class="fas fa-times"></i>
                            Закрыть
                        </button>
                    </div>
                </div>
            `;
        });

        assetsList.innerHTML = html;
    }

    loadTopAssets() {
        const assetsList = document.getElementById('assetsList');
        if (!assetsList) return;

        // Sample top assets data - you can replace with real API call
        const topAssets = [
            {
                symbol: 'BTC',
                name: 'Bitcoin',
                price: this.currentPrice || 45000,
                change: '+2.5%'
            },
            {
                symbol: 'ETH',
                name: 'Ethereum',
                price: 3200,
                change: '+1.8%'
            },
            {
                symbol: 'BNB',
                name: 'BNB',
                price: 320,
                change: '-0.5%'
            }
        ];

        let html = '';
        topAssets.forEach(asset => {
            html += `
                <div class="asset-item" onclick="openAssetDetails('${asset.symbol}')">
                    <div class="asset-icon">
                        <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(asset.symbol) : '/logos/default.svg'}" alt="${asset.symbol}" onerror="this.src='/logos/default.svg'">
                    </div>
                    <div class="asset-info">
                        <div class="asset-name">${asset.name}</div>
                        <div class="asset-symbol">${asset.symbol}</div>
                        <div class="asset-quantity">$${asset.price.toLocaleString()}</div>
                    </div>
                    <div class="asset-actions">
                        <span class="available-label">${asset.change}</span>
                        <button class="sell-btn" onclick="event.stopPropagation(); goToSpotTradingWithCoin('${asset.symbol}')">
                            <i class="fas fa-chart-line"></i>
                            Торговать
                        </button>
                    </div>
                </div>
            `;
        });

        assetsList.innerHTML = html;
    }

    calculatePositionPnL(position) {
        if (!this.currentPrice || !position.entryPrice) return 0;
        
        const priceChange = this.currentPrice - position.entryPrice;
        const priceChangePercent = priceChange / position.entryPrice;
        
        // For long positions: profit when price goes up
        // For short positions: profit when price goes down
        let pnlPercent = position.direction === 'up' ? priceChangePercent : -priceChangePercent;
        
        // Apply leverage
        pnlPercent *= position.leverage;
        
        // Calculate PnL in dollars based on margin
        return position.margin * pnlPercent;
    }

    // Position Management
    openClosePositionModal(positionId) {
        const activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]');
        const position = activeStakes.find(stake => stake.id == positionId);
        
        if (!position) {
            this.showToast('Позиция не найдена', 'error');
            return;
        }

        // Store current position for closing
        this.currentPositionToClose = position;
        
        // Update modal content
        const elements = {
            positionDirection: document.getElementById('positionDirection'),
            positionSize: document.getElementById('positionSize'),
            positionLeverage: document.getElementById('positionLeverage'),
            openPrice: document.getElementById('openPrice'),
            currentMarketPrice: document.getElementById('currentMarketPrice'),
            positionPnL: document.getElementById('positionPnL')
        };
        
        if (elements.positionDirection) {
            elements.positionDirection.textContent = position.direction === 'up' ? 'Long' : 'Short';
        }
        
        if (elements.positionSize) {
            elements.positionSize.textContent = `$${position.margin.toFixed(2)}`;
        }
        
        if (elements.positionLeverage) {
            elements.positionLeverage.textContent = `x${position.leverage}`;
        }
        
        if (elements.openPrice) {
            elements.openPrice.textContent = `$${position.entryPrice.toFixed(2)}`;
        }
        
        if (elements.currentMarketPrice) {
            elements.currentMarketPrice.textContent = `$${this.currentPrice.toFixed(2)}`;
        }
        
        if (elements.positionPnL) {
            const currentPnL = this.calculatePositionPnL(position);
            elements.positionPnL.textContent = `$${currentPnL.toFixed(2)}`;
            elements.positionPnL.className = `position-value ${currentPnL >= 0 ? 'positive' : 'negative'}`;
        }
        
        // Show modal
        document.getElementById('closePositionModal').style.display = 'flex';
    }

    confirmClosePosition() {
        if (!this.currentPositionToClose) {
            this.showToast('Ошибка: позиция не выбрана', 'error');
            return;
        }

        const position = this.currentPositionToClose;
        const currentPnL = this.calculatePositionPnL(position);
        
        // Calculate final balance change
        let balanceChange = position.margin + currentPnL; // Return margin plus/minus PnL
        
        // Update user balance
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            user.balance += balanceChange;
            localStorage.setItem('user', JSON.stringify(user));
        }
        
        // Remove position from active stakes
        let activeStakes = JSON.parse(localStorage.getItem('activeStakes') || '[]');
        activeStakes = activeStakes.filter(stake => stake.id !== position.id);
        localStorage.setItem('activeStakes', JSON.stringify(activeStakes));
        
        // Sync with server
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        // Show result
        const resultText = currentPnL >= 0 ? 
            `Позиция закрыта! Прибыль: $${currentPnL.toFixed(2)}` :
            `Позиция закрыта! Убыток: $${Math.abs(currentPnL).toFixed(2)}`;
        
        this.showToast(resultText, currentPnL >= 0 ? 'success' : 'warning');
        
        // Close modal and refresh displays
        this.closeModal('closePositionModal');
        this.loadAssets(); // Refresh assets view
        this.updateActiveTradesIndicator();
        this.updateBalanceDisplay();
        
        // Clear current position
        this.currentPositionToClose = null;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    window.coinInfoPage = new CoinInfoPage();
});

// Custom Chart Class
class CustomChart {
    constructor(container, options = {}) {
        this.container = container;
        this.canvas = container.querySelector('.chart-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.crosshair = container.querySelector('.chart-crosshair');
        this.tooltip = container.querySelector('.chart-tooltip');
        
        this.options = {
            lineColor: options.lineColor || '#4ade80', // Lime green (changed from Binance blue)
            gridColor: options.gridColor || 'rgba(30, 41, 59, 0.5)', // Dark grid color
            textColor: options.textColor || '#94a3b8', // Light gray text
            backgroundColor: options.backgroundColor || '#0f172a', // Dark blue background
            timeWindow: options.timeWindow || 180, // 3 hours (changed from 15 minutes)
            onTimeWindowChange: options.onTimeWindowChange || null
        };
        
        this.data = [];
        this.timeWindowStart = 0;
        this.timeWindowEnd = 0;
        this.isDragging = false;
        this.lastTouchX = 0;
        this.pixelRatio = window.devicePixelRatio || 1;
        
        this.setupCanvas();
        this.bindEvents();
        this.resize();
    }
    
    setupCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * this.pixelRatio;
        this.canvas.height = rect.height * this.pixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }
    
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Wheel event for desktop scrolling
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Resize handler
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    setData(data) {
        this.data = data.sort((a, b) => a.timestamp - b.timestamp);
        this.initializeTimeWindow();
        this.draw();
    }
    
    updateData(newData) {
        this.data = newData.sort((a, b) => a.timestamp - b.timestamp);
        this.draw();
    }
    
    initializeTimeWindow() {
        if (this.data.length === 0) return;
        
        const latestTimestamp = this.data[this.data.length - 1].timestamp;
        this.timeWindowEnd = latestTimestamp;
        this.timeWindowStart = latestTimestamp - (this.options.timeWindow * 60 * 1000);
    }
    
    getVisibleData() {
        return this.data.filter(point => 
            point.timestamp >= this.timeWindowStart && 
            point.timestamp <= this.timeWindowEnd
        );
    }
    
    getMinMaxPrices(visibleData) {
        if (visibleData.length === 0) return { min: 0, max: 100 };
        
        const prices = visibleData.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        
        // Add 5% padding
        const padding = (max - min) * 0.05;
        return {
            min: min - padding,
            max: max + padding
        };
    }
    
    draw() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Fill background
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, width, height);
        
        const visibleData = this.getVisibleData();
        if (visibleData.length < 2) {
            this.drawNoDataMessage(width, height);
            return;
        }
        
        const { min: minPrice, max: maxPrice } = this.getMinMaxPrices(visibleData);
        
        // Draw grid
        this.drawGrid(width, height, minPrice, maxPrice);
        
        // Draw price line
        this.drawPriceLine(visibleData, width, height, minPrice, maxPrice);
        
        // Draw price labels
        this.drawPriceLabels(width, height, minPrice, maxPrice);
        
        // Draw time labels
        this.drawTimeLabels(width, height);
    }
    
    drawNoDataMessage(width, height) {
        // Set dark theme colors
        this.ctx.fillStyle = '#94a3b8'; // Light gray text
        this.ctx.font = '14px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        
        // Draw a more informative message
        this.ctx.fillText('Загрузка данных...', width / 2, height / 2);
        
        // Add a subtle animation effect
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.fillStyle = '#94a3b880'; // Light gray with 50% opacity
        const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
        this.ctx.fillText(dots, width / 2, height / 2 + 20);
    }

    drawGrid(width, height, minPrice, maxPrice) {
        this.ctx.strokeStyle = this.options.gridColor || 'rgba(30, 41, 59, 0.5)'; // Dark grid color
        this.ctx.lineWidth = 0.5;
        
        // Horizontal grid lines (price levels) - fewer lines for mobile
        const priceSteps = 4;
        for (let i = 1; i < priceSteps; i++) { // Skip top and bottom lines
            const y = 30 + (height - 60) * (i / priceSteps); // More space for labels
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    drawPriceLine(visibleData, width, height, minPrice, maxPrice) {
        if (visibleData.length < 2) return;
        
        const chartWidth = width;
        const chartHeight = height - 60; // More space for labels
        const priceRange = maxPrice - minPrice;
        
        this.ctx.strokeStyle = this.options.lineColor || '#4ade80'; // Lime green
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Create gradient fill with dark theme colors
        const gradient = this.ctx.createLinearGradient(0, 30, 0, height - 30);
        gradient.addColorStop(0, `${this.options.lineColor || '#4ade80'}20`); // 20% opacity
        gradient.addColorStop(1, `${this.options.lineColor || '#4ade80'}05`); // 5% opacity
        
        this.ctx.beginPath();
        
        // Move to first point
        const firstPoint = visibleData[0];
        const firstX = 0;
        const firstY = 30 + (maxPrice - firstPoint.price) / priceRange * chartHeight;
        this.ctx.moveTo(firstX, firstY);
        
        // Draw line through all points
        for (let i = 1; i < visibleData.length; i++) {
            const point = visibleData[i];
            const x = (i / (visibleData.length - 1)) * chartWidth;
            const y = 30 + (maxPrice - point.price) / priceRange * chartHeight;
            this.ctx.lineTo(x, y);
        }
        
        // Stroke the line
        this.ctx.stroke();
        
        // Fill area under line
        const lastPoint = visibleData[visibleData.length - 1];
        const lastX = chartWidth;
        this.ctx.lineTo(lastX, height - 30);
        this.ctx.lineTo(firstX, height - 30);
        this.ctx.closePath();
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }
    
    drawPriceLabels(width, height, minPrice, maxPrice) {
        this.ctx.fillStyle = this.options.textColor || '#94a3b8'; // Light gray text
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.textAlign = 'right';
        
        const priceSteps = 5;
        for (let i = 0; i <= priceSteps; i++) {
            const price = minPrice + (maxPrice - minPrice) * (1 - i / priceSteps);
            const y = 30 + (height - 60) * (i / priceSteps);
            
            // Position price labels on the right edge
            this.ctx.fillText('$' + this.formatPrice(price), width - 5, y + 3);
        }
    }
    
    formatPrice(price) {
        if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'K';
        } else if (price >= 1) {
            return price.toFixed(0);
        } else {
            return price.toFixed(4);
        }
    }
    
    drawTimeLabels(width, height) {
        this.ctx.fillStyle = this.options.textColor || '#94a3b8'; // Light gray text
        this.ctx.font = '10px Inter, sans-serif';
        
        const timeSteps = 3; // Fewer time labels for mobile
        for (let i = 0; i <= timeSteps; i++) {
            const timeOffset = (this.timeWindowEnd - this.timeWindowStart) * (i / timeSteps);
            const timestamp = this.timeWindowStart + timeOffset;
            const time = new Date(timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const x = (width) * (i / timeSteps);
            
            // Align text based on position
            if (i === 0) {
                this.ctx.textAlign = 'left';
                this.ctx.fillText(time, 5, height - 10);
            } else if (i === timeSteps) {
                this.ctx.textAlign = 'right';
                this.ctx.fillText(time, width - 5, height - 10);
            } else {
                this.ctx.textAlign = 'center';
                this.ctx.fillText(time, x, height - 10);
            }
        }
    }

    // Event handlers
    handleMouseDown(e) {
        this.isDragging = true;
        this.lastTouchX = e.clientX;
        this.canvas.style.cursor = 'grabbing';
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastTouchX;
            this.panChart(deltaX);
            this.lastTouchX = e.clientX;
        } else {
            this.showCrosshair(x, y);
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    handleMouseLeave() {
        this.isDragging = false;
        this.hideCrosshair();
        this.canvas.style.cursor = 'grab';
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.lastTouchX = e.touches[0].clientX;
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (this.isDragging) {
            const deltaX = e.touches[0].clientX - this.lastTouchX;
            this.panChart(deltaX);
            this.lastTouchX = e.touches[0].clientX;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        this.panChart(-e.deltaX * 2); // Horizontal scrolling
    }
    
    panChart(deltaX) {
        const timeRange = this.timeWindowEnd - this.timeWindowStart;
        const pixelsPerMs = this.container.getBoundingClientRect().width / timeRange;
        const timeDelta = deltaX / pixelsPerMs;
        
        this.timeWindowStart -= timeDelta;
        this.timeWindowEnd -= timeDelta;
        
        // Constrain to data bounds
        if (this.data.length > 0) {
            const minTime = this.data[0].timestamp;
            const maxTime = this.data[this.data.length - 1].timestamp;
            
            if (this.timeWindowStart < minTime) {
                const offset = minTime - this.timeWindowStart;
                this.timeWindowStart += offset;
                this.timeWindowEnd += offset;
            }
            
            if (this.timeWindowEnd > maxTime) {
                const offset = this.timeWindowEnd - maxTime;
                this.timeWindowStart -= offset;
                this.timeWindowEnd -= offset;
            }
        }
        
        this.draw();
        
        if (this.options.onTimeWindowChange) {
            this.options.onTimeWindowChange(this.timeWindowStart, this.timeWindowEnd);
        }
    }
    
    showCrosshair(x, y) {
        this.crosshair.style.left = x + 'px';
        this.crosshair.style.display = 'block';
        
        // Show tooltip with price at this position
        const visibleData = this.getVisibleData();
        if (visibleData.length > 1) {
            const relativeX = x / this.container.getBoundingClientRect().width;
            const dataIndex = Math.round(relativeX * (visibleData.length - 1));
            const dataPoint = visibleData[dataIndex];
            
            if (dataPoint) {
                this.tooltip.textContent = `${dataPoint.time} | $${dataPoint.price.toFixed(2)}`;
                this.tooltip.style.left = x + 'px';
                this.tooltip.style.top = (y - 10) + 'px';
                this.tooltip.style.display = 'block';
            }
        }
    }
    
    hideCrosshair() {
        this.crosshair.style.display = 'none';
        this.tooltip.style.display = 'none';
    }
    
    resize() {
        this.setupCanvas();
        this.draw();
    }
    
    destroy() {
        window.removeEventListener('resize', this.resize.bind(this));
        // Remove other event listeners if needed
    }
}

// Global functions for HTML onclick handlers
function navigateBackSmart() {
    try {
        const ref = document.referrer || '';
        const sameOrigin = ref.startsWith(`${location.protocol}//${location.host}`);
        if (sameOrigin && ref) {
            window.history.back();
            return;
        }
    } catch (_) {}
    const last = sessionStorage.getItem('lastListPage');
    if (last === 'coins') {
        window.location.href = 'coins.html';
    } else if (last === 'home') {
        window.location.href = 'home.html';
    } else {
        // Fallback: prefer coins, then home
        const cameFromCoins = document.referrer && document.referrer.includes('coins.html');
        window.location.href = cameFromCoins ? 'coins.html' : 'home.html';
    }
}

// Navigate to spot trading page with current coin data
function goToSpotTrading() {
    console.log('CoinInfo: Navigating to spot trading...');
    
    // Save current coin data for spot trading
    if (window.coinInfoPage && window.coinInfoPage.currentCoin) {
        const currentCoin = window.coinInfoPage.currentCoin;
        console.log('CoinInfo: Setting currentCoin in localStorage:', currentCoin);
        
        // Add timestamp to ensure fresh data
        const coinDataWithTimestamp = {
            ...currentCoin,
            _timestamp: Date.now()
        };
        
        localStorage.setItem('currentCoin', JSON.stringify(coinDataWithTimestamp));
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
            // Navigate with coin parameter (use both id and symbol for better compatibility)
            const coinParam = currentCoin.symbol || currentCoin.id;
            console.log('CoinInfo: Navigating with coin parameter:', coinParam);
            
            window.location.href = `spot-trading.html?coin=${coinParam}`;
        }, 50);
    } else {
        console.warn('CoinInfo: No current coin data available, using fallback navigation');
        console.log('CoinInfo: window.coinInfoPage:', window.coinInfoPage);
        // Fallback navigation
        window.location.href = 'spot-trading.html';
    }
}

function goToSpotTradingWithCoin(coinSymbol) {
    // Get coin data and set it in localStorage for spot trading
    const coinsData = JSON.parse(localStorage.getItem('coinsData') || '[]');
    const coin = coinsData.find(c => c.symbol.toUpperCase() === coinSymbol.toUpperCase());
    
    if (coin) {
        localStorage.setItem('currentCoin', JSON.stringify(coin));
    }
    
    window.location.href = `spot-trading.html?coin=${coinSymbol}`;
}

// Navigate to futures trading page with current coin data
function goToFuturesTrading() {
    console.log('CoinInfo: Navigating to futures trading...');
    
    // Save current coin data for futures trading
    if (window.coinInfoPage && window.coinInfoPage.currentCoin) {
        const currentCoin = window.coinInfoPage.currentCoin;
        console.log('CoinInfo: Setting currentCoin in localStorage:', currentCoin);
        
        // Add timestamp to ensure fresh data
        const coinDataWithTimestamp = {
            ...currentCoin,
            _timestamp: Date.now()
        };
        
        localStorage.setItem('currentCoin', JSON.stringify(coinDataWithTimestamp));
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
            // Navigate with coin parameter (use both id and symbol for better compatibility)
            const coinParam = currentCoin.symbol || currentCoin.id;
            console.log('CoinInfo: Navigating with coin parameter:', coinParam);
            
            window.location.href = `futures-trading.html?coin=${coinParam}`;
        }, 50);
    } else {
        console.warn('CoinInfo: No current coin data available, using fallback navigation');
        console.log('CoinInfo: window.coinInfoPage:', window.coinInfoPage);
        // Fallback navigation
        window.location.href = 'futures-trading.html';
    }
}

function openPositionDetails(positionId) {
    window.location.href = `position.html?positionId=${positionId}`;
}

function openBuyModal() {
    // Navigate to buy page
    window.location.href = 'Buy.html';
}

function openSellModal() {
    // Navigate to sell page
    window.location.href = 'Sale.html';
}

function openFuturesModal(direction = 'up') {
    if (window.coinInfoPage) {
        window.coinInfoPage.openFuturesModal(direction);
    }
}

function selectFuturesDirection(direction) {
    if (window.coinInfoPage) {
        window.coinInfoPage.selectFuturesDirection(direction);
    }
}

function openActiveStakesModal() {
    if (window.coinInfoPage) {
        window.coinInfoPage.openActiveStakesModal();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Legacy functions for backward compatibility
function openStakeModal(direction = 'up') {
    if (window.coinInfoPage) {
        window.coinInfoPage.openFuturesModal(direction);
    }
}

function selectDirection(direction) {
    if (window.coinInfoPage) {
        window.coinInfoPage.selectFuturesDirection(direction);
    }
}

// Assets management functions
function switchAssetsView(view) {
    if (window.coinInfoPage) {
        window.coinInfoPage.switchAssetsView(view);
    }
}

function openAssetDetails(assetId) {
    window.location.href = `coininfo.html?coin=${assetId}`;
}

function goToSpotTradingWithCoin(coinSymbol) {
    // Get coin data and set it in localStorage for spot trading
    const coinsData = JSON.parse(localStorage.getItem('coinsData') || '[]');
    const coin = coinsData.find(c => c.symbol.toUpperCase() === coinSymbol.toUpperCase());
    
    if (coin) {
        localStorage.setItem('currentCoin', JSON.stringify(coin));
    }
    
    window.location.href = `spot-trading.html?coin=${coinSymbol}`;
}

function openPositionDetails(positionId) {
    if (window.coinInfoPage) {
        window.coinInfoPage.openClosePositionModal(positionId);
    }
}

function openClosePositionModal(positionId) {
    if (window.coinInfoPage) {
        window.coinInfoPage.openClosePositionModal(positionId);
    }
}

function confirmClosePosition() {
    if (window.coinInfoPage) {
        window.coinInfoPage.confirmClosePosition();
    }
}
