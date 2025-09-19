// Futures Trading JavaScript

class FuturesTrading {
    constructor() {
        this.futuresDirection = 'up'; // Default direction
        this.currentLeverage = 3; // Default leverage
        this.currentPrice = 0;
        this.positionsTab = 'open'; // Default positions tab
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeLeverageSlider();
        this.updateBalanceDisplay();
        this.loadCoinData();
        this.calculateFuturesPotential();
    }

    bindEvents() {
        // Form submission
        const futuresForm = document.getElementById('futuresForm');
        if (futuresForm) {
            futuresForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFuturesOrder();
            });
        }

        // Amount input
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

        // Stop Loss and Take Profit inputs
        const stopLoss = document.getElementById('stopLoss');
        const takeProfit = document.getElementById('takeProfit');
        
        if (stopLoss) {
            stopLoss.addEventListener('input', () => {
                this.validateStopLossTakeProfit();
            });
        }
        
        if (takeProfit) {
            takeProfit.addEventListener('input', () => {
                this.validateStopLossTakeProfit();
            });
        }
    }

    // Initialize leverage slider
    initializeLeverageSlider() {
        const leverageSlider = document.getElementById('leverageSlider');
        if (leverageSlider) {
            this.updateLeverageSlider(1); // Default to x3
        }
    }

    // Update leverage slider
    updateLeverageSlider(value) {
        const leverageValues = [2, 3, 5, 8, 10];
        const index = parseInt(value);
        const leverage = leverageValues[index];
        
        this.currentLeverage = leverage;
        
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

    // Select futures direction
    selectFuturesDirection(direction) {
        this.futuresDirection = direction;
        
        // Update active button
        const directionBtns = document.querySelectorAll('.direction-btn');
        directionBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === direction) {
                btn.classList.add('active');
            }
        });
        
        // Update submit button
        const submitBtn = document.getElementById('futuresSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = `Открыть ${direction === 'up' ? 'Long' : 'Short'} позицию`;
            submitBtn.className = `trade-btn primary futures-submit-btn ${direction === 'up' ? 'long-btn' : 'short-btn'}`;
        }
        
        this.calculateFuturesPotential();
    }

    // Set percentage of balance
    setPercentage(percentage) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        const balance = user.balance || 0;
        const amount = (balance * percentage / 100);
        
        const futuresAmount = document.getElementById('futuresAmount');
        if (futuresAmount) {
            futuresAmount.value = amount.toFixed(2);
            this.calculateFuturesPotential();
        }
    }

    // Calculate futures potential
    calculateFuturesPotential() {
        const amountElement = document.getElementById('futuresAmount');
        const amount = amountElement ? parseFloat(amountElement.value) || 0 : 0;
        const leverage = this.currentLeverage || 3;
        
        // Trading volume
        const tradingVolume = amount * leverage;
        
        // Potential profit/loss at 1% change
        const profitOn1Percent = amount * leverage * 0.01;
        const profitPercent = leverage * 1; // 1% change * leverage
        
        // Liquidation price
        const liquidationPrice = this.currentPrice ? this.calculateLiquidationPrice(this.currentPrice, this.futuresDirection, leverage) : 0;
        
        // Update display
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
            elements.potentialWin.textContent = `+$${profitOn1Percent.toFixed(2)} (+${profitPercent.toFixed(2)}%)`;
            elements.potentialWin.className = 'result-value positive';
        }
        
        if (elements.potentialLoss) {
            elements.potentialLoss.textContent = `-$${profitOn1Percent.toFixed(2)} (-${profitPercent.toFixed(2)}%)`;
            elements.potentialLoss.className = 'result-value negative';
        }
        
        if (elements.liquidationPrice) {
            elements.liquidationPrice.textContent = `$${liquidationPrice.toFixed(2)}`;
            elements.liquidationPrice.className = 'result-value warning';
        }
    }

    // Calculate liquidation price
    calculateLiquidationPrice(entryPrice, direction, leverage) {
        // Simple formula: liquidation at ~90% loss of margin
        const liquidationThreshold = 0.9;
        const priceChangePercent = liquidationThreshold / leverage;
        
        if (direction === 'up') {
            // Long: liquidation when price drops
            return entryPrice * (1 - priceChangePercent);
        } else {
            // Short: liquidation when price rises
            return entryPrice * (1 + priceChangePercent);
        }
    }

    // Validate Stop Loss and Take Profit
    validateStopLossTakeProfit() {
        const stopLoss = document.getElementById('stopLoss');
        const takeProfit = document.getElementById('takeProfit');
        
        if (!stopLoss || !takeProfit) return;
        
        const stopLossValue = parseFloat(stopLoss.value);
        const takeProfitValue = parseFloat(takeProfit.value);
        
        if (isNaN(stopLossValue) && isNaN(takeProfitValue)) return;
        
        // For Long positions
        if (this.futuresDirection === 'up') {
            if (!isNaN(stopLossValue) && stopLossValue >= this.currentPrice) {
                this.showToast('Stop-Loss должен быть ниже текущей цены для Long позиции', 'error');
                stopLoss.value = '';
            }
            
            if (!isNaN(takeProfitValue) && takeProfitValue <= this.currentPrice) {
                this.showToast('Take-Profit должен быть выше текущей цены для Long позиции', 'error');
                takeProfit.value = '';
            }
        } 
        // For Short positions
        else {
            if (!isNaN(stopLossValue) && stopLossValue <= this.currentPrice) {
                this.showToast('Stop-Loss должен быть выше текущей цены для Short позиции', 'error');
                stopLoss.value = '';
            }
            
            if (!isNaN(takeProfitValue) && takeProfitValue >= this.currentPrice) {
                this.showToast('Take-Profit должен быть ниже текущей цены для Short позиции', 'error');
                takeProfit.value = '';
            }
        }
    }

    // Handle futures order
    handleFuturesOrder() {
        const amountElement = document.getElementById('futuresAmount');
        const stopLossElement = document.getElementById('stopLoss');
        const takeProfitElement = document.getElementById('takeProfit');
        
        const amount = amountElement ? parseFloat(amountElement.value) : 0;
        const stopLoss = stopLossElement ? parseFloat(stopLossElement.value) : null;
        const takeProfit = takeProfitElement ? parseFloat(takeProfitElement.value) : null;
        
        const direction = this.futuresDirection;
        const leverage = this.currentLeverage || 3;
        
        if (amount < 10) {
            this.showToast('Минимальный размер позиции: $10', 'error');
            return;
        }

        // Check balance (margin requirements)
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств для маржи', 'error');
            return;
        }

        // Validate Stop Loss and Take Profit
        if (stopLoss) {
            if (direction === 'up' && stopLoss >= this.currentPrice) {
                this.showToast('Stop-Loss должен быть ниже текущей цены для Long позиции', 'error');
                return;
            }
            if (direction === 'down' && stopLoss <= this.currentPrice) {
                this.showToast('Stop-Loss должен быть выше текущей цены для Short позиции', 'error');
                return;
            }
        }
        
        if (takeProfit) {
            if (direction === 'up' && takeProfit <= this.currentPrice) {
                this.showToast('Take-Profit должен быть выше текущей цены для Long позиции', 'error');
                return;
            }
            if (direction === 'down' && takeProfit >= this.currentPrice) {
                this.showToast('Take-Profit должен быть ниже текущей цены для Short позиции', 'error');
                return;
            }
        }

        // Calculate liquidation price
        const liquidationPrice = this.calculateLiquidationPrice(this.currentPrice, direction, leverage);

        this.showToast(`Открытие ${direction === 'up' ? 'Long' : 'Short'} позиции...`, 'info');
        
        // Create perpetual futures position
        const futuresPosition = {
            id: Date.now() + Math.random(),
            coinId: this.getCurrentCoin().id,
            coinSymbol: this.getCurrentCoin().symbol,
            coinName: this.getCurrentCoin().name,
            margin: amount, // Margin (collateral)
            size: amount * leverage, // Position size
            direction: direction,
            leverage: leverage,
            entryPrice: this.currentPrice,
            liquidationPrice: liquidationPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            openTime: new Date(),
            status: 'open',
            type: 'perpetual_futures',
            unrealizedPnL: 0
        };
        
        // Add position to futures positions in localStorage
        let futuresPositions = JSON.parse(localStorage.getItem('futuresPositions') || '[]');
        futuresPositions.push(futuresPosition);
        localStorage.setItem('futuresPositions', JSON.stringify(futuresPositions));
        
        // Deduct margin from balance
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Show success modal
        this.showSuccessModal(futuresPosition);
        
        // Reset form
        if (amountElement) amountElement.value = '';
        if (stopLossElement) stopLossElement.value = '';
        if (takeProfitElement) takeProfitElement.value = '';
        this.calculateFuturesPotential();
        
        // Update balance display
        this.updateBalanceDisplay();
    }

    // Show success modal
    showSuccessModal(position) {
        const modal = document.getElementById('successModal');
        if (!modal) return;
        
        // Update modal content
        const successTitle = document.getElementById('successTitle');
        const successMessage = document.getElementById('successMessage');
        const successDetails = document.getElementById('successDetails');
        
        if (successTitle) {
            successTitle.textContent = 'Позиция открыта!';
        }
        
        if (successMessage) {
            successMessage.textContent = `Ваша ${position.direction === 'up' ? 'Long' : 'Short'} позиция успешно открыта`;
        }
        
        if (successDetails) {
            const pnlPercentage = ((position.unrealizedPnL || 0) / position.margin * 100).toFixed(2);
            successDetails.innerHTML = `
                <div class="detail-row">
                    <span>Монета:</span>
                    <span>${position.coinSymbol}</span>
                </div>
                <div class="detail-row">
                    <span>Направление:</span>
                    <span>${position.direction === 'up' ? 'Long' : 'Short'}</span>
                </div>
                <div class="detail-row">
                    <span>Плечо:</span>
                    <span>x${position.leverage}</span>
                </div>
                <div class="detail-row">
                    <span>Маржа:</span>
                    <span>$${position.margin.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span>Объем:</span>
                    <span>$${position.size.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span>Цена входа:</span>
                    <span>$${position.entryPrice.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span>Ликвидация при:</span>
                    <span>$${position.liquidationPrice.toFixed(2)}</span>
                </div>
                ${position.stopLoss ? `
                <div class="detail-row">
                    <span>Stop-Loss:</span>
                    <span>$${position.stopLoss.toFixed(2)}</span>
                </div>` : ''}
                ${position.takeProfit ? `
                <div class="detail-row">
                    <span>Take-Profit:</span>
                    <span>$${position.takeProfit.toFixed(2)}</span>
                </div>` : ''}
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
    }

    // Close success modal
    closeSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Switch positions tab
    switchPositionsTab(tab) {
        this.positionsTab = tab;
        
        // Update active tab
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(tab.toLowerCase())) {
                btn.classList.add('active');
            }
        });
        
        // In a real implementation, this would load the appropriate positions
        this.showToast(`Переключено на вкладку: ${tab === 'open' ? 'Открытые' : tab === 'closed' ? 'Закрытые' : 'История'}`, 'info');
    }

    // Update balance display
    updateBalanceDisplay() {
        const user = JSON.parse(localStorage.getItem('user'));
        const balance = user ? user.balance : 0;
        
        // Update balance displays
        const elements = {
            accountBalance: document.getElementById('accountBalance'),
            accountBalanceDisplay: document.getElementById('accountBalanceDisplay')
        };
        
        Object.values(elements).forEach(element => {
            if (element) {
                element.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        });
        
        // Update current price display
        const currentPriceDisplay = document.getElementById('currentPriceDisplay');
        if (currentPriceDisplay) {
            currentPriceDisplay.textContent = `$${this.currentPrice.toFixed(2)}`;
        }
    }

    // Load coin data
    loadCoinData() {
        // Try to get current coin from localStorage
        const savedCoin = localStorage.getItem('currentCoin');
        if (savedCoin) {
            try {
                const coin = JSON.parse(savedCoin);
                this.updateCoinInfo(coin);
                return;
            } catch (e) {
                console.error('Error parsing saved coin data:', e);
            }
        }
        
        // Fallback to default BTC data
        const defaultCoin = {
            id: 'bitcoin',
            symbol: 'BTC',
            name: 'Bitcoin',
            price: 67543.21,
            priceChange: 1650.32,
            priceChangePercent: 2.45
        };
        
        this.updateCoinInfo(defaultCoin);
    }

    // Update coin info
    updateCoinInfo(coin) {
        // Update coin icon
        const coinIcon = document.getElementById('selectedCoinIcon');
        if (coinIcon) {
            coinIcon.src = window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coin.symbol) : '/logos/default.svg';
            coinIcon.alt = coin.symbol;
        }
        
        // Update coin name and symbol
        const coinName = document.getElementById('selectedCoinName');
        const coinSymbol = document.getElementById('selectedCoinSymbol');
        
        if (coinName) coinName.textContent = coin.name;
        if (coinSymbol) coinSymbol.textContent = `${coin.symbol}/USD`;
        
        // Update price
        this.currentPrice = coin.price || 0;
        const priceElement = document.getElementById('currentPrice');
        if (priceElement) {
            priceElement.textContent = `$${this.formatPrice(this.currentPrice)}`;
        }
        
        // Update price change
        const priceChange = coin.priceChange || 0;
        const priceChangePercent = coin.priceChangePercent || 0;
        const changeElement = document.getElementById('priceChange');
        
        if (changeElement) {
            const isPositive = priceChangePercent >= 0;
            changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
            changeElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%
            `;
        }
        
        // Update displays
        this.updateBalanceDisplay();
        this.calculateFuturesPotential();
    }

    // Get current coin
    getCurrentCoin() {
        const savedCoin = localStorage.getItem('currentCoin');
        if (savedCoin) {
            try {
                return JSON.parse(savedCoin);
            } catch (e) {
                console.error('Error parsing saved coin data:', e);
            }
        }
        
        // Default BTC
        return {
            id: 'bitcoin',
            symbol: 'BTC',
            name: 'Bitcoin'
        };
    }

    // Format price
    formatPrice(price) {
        if (price >= 1000) {
            return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (price >= 1) {
            return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
        } else {
            return price.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        if (window.notificationManager) {
            return window.notificationManager.show(message, type, {
                duration: 5000
            });
        }
        
        // Fallback
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // Navigation functions
    goBack() {
        window.history.back();
    }
}

// Global functions for HTML onclick handlers
function selectFuturesDirection(direction) {
    if (window.futuresTrading) {
        window.futuresTrading.selectFuturesDirection(direction);
    }
}

function setPercentage(percentage) {
    if (window.futuresTrading) {
        window.futuresTrading.setPercentage(percentage);
    }
}

function switchPositionsTab(tab) {
    if (window.futuresTrading) {
        window.futuresTrading.switchPositionsTab(tab);
    }
}

function closeSuccessModal() {
    if (window.futuresTrading) {
        window.futuresTrading.closeSuccessModal();
    }
}

function goBack() {
    if (window.futuresTrading) {
        window.futuresTrading.goBack();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.futuresTrading = new FuturesTrading();
});