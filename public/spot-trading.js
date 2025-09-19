class SpotTrading {
    constructor() {
        console.log('SpotTrading: Constructor starting...');
        console.log('SpotTrading: URL at construction:', window.location.href);
        console.log('SpotTrading: localStorage before getCurrentCoinData:', localStorage.getItem('currentCoin'));
        
        // Get coin data from URL parameters or localStorage
        this.currentCoin = this.getCurrentCoinData();
        console.log('SpotTrading: Current coin set to:', this.currentCoin);
        
        this.currentPair = {
            base: this.currentCoin.symbol,
            quote: 'USDT',
            baseFullName: this.currentCoin.name,
            quoteFullName: 'Tether USD'
        };
        
        console.log('SpotTrading: Current pair:', this.currentPair);
        
        this.currentPrice = this.currentCoin.current_price || 0;
        
        // Ensure we have a valid price
        if (this.currentPrice <= 0) {
            this.currentPrice = this.getFallbackPrice(this.currentCoin.symbol);
        }
        
        console.log('SpotTrading: Current price:', this.currentPrice);
        
        this.orderType = 'market'; // market or limit
        this.tradeType = 'buy'; // buy or sell
        
        // Load real user balance
        this.balance = this.loadUserBalance();
        this.portfolio = [];
        this.reservedFunds = {}; // For tracking reserved funds for limit orders
        this.orderHistory = [];
        this.fees = {
            maker: 0.001, // 0.1%
            taker: 0.001  // 0.1%
        };
        
        console.log('SpotTrading: Constructor completed, calling init...');
        this.init();
    }

    getCurrentCoinData() {
        console.log('SpotTrading: Getting current coin data...');
        console.log('SpotTrading: Current URL:', window.location.href);
        
        // Try to get coin data from URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const coinSymbol = urlParams.get('coin');
        console.log('SpotTrading: URL coin parameter:', coinSymbol);
        
        // Try to get from localStorage (last viewed coin)
        const lastCoin = localStorage.getItem('currentCoin');
        console.log('SpotTrading: localStorage currentCoin raw:', lastCoin);
        
        let coinFromStorage = null;
        if (lastCoin) {
            try {
                coinFromStorage = JSON.parse(lastCoin);
                console.log('SpotTrading: Parsed coin from localStorage:', coinFromStorage);
            } catch (error) {
                console.error('SpotTrading: Error parsing localStorage coin data:', error);
            }
        }
        
        // If we have both URL parameter and localStorage data, prefer localStorage if it matches URL
        if (coinSymbol && coinFromStorage) {
            if (coinFromStorage.symbol && coinFromStorage.symbol.toUpperCase() === coinSymbol.toUpperCase()) {
                console.log('SpotTrading: Using coin from localStorage (matches URL):', coinFromStorage);
                return coinFromStorage;
            }
        }
        
        // If we have localStorage data and no URL parameter, use localStorage
        if (coinFromStorage && !coinSymbol) {
            console.log('SpotTrading: Using coin from localStorage (no URL param):', coinFromStorage);
            return coinFromStorage;
        }
        
        // If we have URL parameter, try to find coin data for it
        if (coinSymbol) {
            console.log('SpotTrading: Trying to find coin by symbol:', coinSymbol);
            
            // First try to get from localStorage saved coins
            const savedCoins = localStorage.getItem('coinsData');
            if (savedCoins) {
                try {
                    const coins = JSON.parse(savedCoins);
                    const coin = coins.find(c => c.symbol && c.symbol.toUpperCase() === coinSymbol.toUpperCase());
                    if (coin) {
                        console.log('SpotTrading: Found coin in coinsData:', coin);
                        // Update localStorage with this coin for consistency
                        localStorage.setItem('currentCoin', JSON.stringify(coin));
                        return coin;
                    }
                } catch (error) {
                    console.error('SpotTrading: Error parsing coinsData:', error);
                }
            }
            
            // Try exchange coins data
            const exchangeCoins = localStorage.getItem('exchangeCoins');
            if (exchangeCoins) {
                try {
                    const coins = JSON.parse(exchangeCoins);
                    const coin = coins.find(c => c.symbol && c.symbol.toUpperCase() === coinSymbol.toUpperCase());
                    if (coin) {
                        console.log('SpotTrading: Found coin in exchangeCoins:', coin);
                        // Update localStorage with this coin for consistency
                        localStorage.setItem('currentCoin', JSON.stringify(coin));
                        return coin;
                    }
                } catch (error) {
                    console.error('SpotTrading: Error parsing exchangeCoins:', error);
                }
            }
            
            // Create a basic coin object from symbol if no detailed data found
            const createdCoin = this.createCoinFromSymbol(coinSymbol);
            console.log('SpotTrading: Created coin from symbol:', createdCoin);
            // Update localStorage with this created coin
            localStorage.setItem('currentCoin', JSON.stringify(createdCoin));
            return createdCoin;
        }
        
        // If we have localStorage data but no URL parameter, use it
        if (coinFromStorage) {
            console.log('SpotTrading: Using coin from localStorage (fallback):', coinFromStorage);
            return coinFromStorage;
        }
        
        // Final fallback: Bitcoin
        console.log('SpotTrading: Using Bitcoin fallback');
        const fallbackCoin = {
            id: 'bitcoin',
            symbol: 'BTC',
            name: 'Bitcoin',
            current_price: 67000,
            market_cap: 1320000000000,
            total_volume: 28000000000,
            price_change_percentage_24h: 2.45
        };
        localStorage.setItem('currentCoin', JSON.stringify(fallbackCoin));
        return fallbackCoin;
    }
    
    createCoinFromSymbol(symbol) {
        // Create basic coin data when only symbol is available
        const coinNames = {
            'BTC': { name: 'Bitcoin', id: 'bitcoin' },
            'ETH': { name: 'Ethereum', id: 'ethereum' },
            'BNB': { name: 'Binance Coin', id: 'binancecoin' },
            'ADA': { name: 'Cardano', id: 'cardano' },
            'SOL': { name: 'Solana', id: 'solana' },
            'DOGE': { name: 'Dogecoin', id: 'dogecoin' },
            'XRP': { name: 'Ripple', id: 'ripple' },
            'DOT': { name: 'Polkadot', id: 'polkadot' },
            'AVAX': { name: 'Avalanche', id: 'avalanche-2' },
            'LINK': { name: 'Chainlink', id: 'chainlink' },
            'MATIC': { name: 'Polygon', id: 'polygon' },
            'UNI': { name: 'Uniswap', id: 'uniswap' },
            'LTC': { name: 'Litecoin', id: 'litecoin' },
            'XLM': { name: 'Stellar', id: 'stellar' },
            'ATOM': { name: 'Cosmos', id: 'cosmos' },
            'ALGO': { name: 'Algorand', id: 'algorand' },
            'VET': { name: 'VeChain', id: 'vechain' },
            'FIL': { name: 'Filecoin', id: 'filecoin' },
            'TRX': { name: 'TRON', id: 'tron' }
        };
        
        const symbolUpper = symbol.toUpperCase();
        const coinInfo = coinNames[symbolUpper] || { name: symbolUpper, id: symbolUpper.toLowerCase() };
        
        return {
            id: coinInfo.id,
            symbol: symbolUpper,
            name: coinInfo.name,
            current_price: this.getFallbackPrice(symbolUpper),
            market_cap: 0,
            total_volume: 0,
            price_change_percentage_24h: 0
        };
    }

    loadUserBalance() {
        // Load real user balance from localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            const balance = {
                USDT: user.balance || 1000 // Main balance in USDT
            };
            
            // Add any saved crypto balances
            const savedCryptoBalance = localStorage.getItem('spotBalance');
            if (savedCryptoBalance) {
                const cryptoBalance = JSON.parse(savedCryptoBalance);
                Object.assign(balance, cryptoBalance);
            }
            
            return balance;
        }
        
        // Fallback balance
        return {
            USDT: 1000,
            [this.currentCoin.symbol]: 0
        };
    }

    getFallbackPrice(symbol) {
        const fallbackPrices = {
            'BTC': 67000,
            'ETH': 3500,
            'BNB': 320,
            'ADA': 0.45,
            'SOL': 140,
            'DOGE': 0.08,
            'XRP': 0.55,
            'DOT': 6.5,
            'AVAX': 35,
            'LINK': 15,
            'MATIC': 0.85,
            'UNI': 7.5,
            'LTC': 95,
            'XLM': 0.12,
            'ATOM': 9.5,
            'ALGO': 0.18,
            'VET': 0.025,
            'FIL': 5.2,
            'TRX': 0.095
        };
        return fallbackPrices[symbol.toUpperCase()] || 1;
    }

    async init() {
        this.loadUserData();
        this.setupEventListeners();
        
        // Try to load more complete coin data from API
        await this.loadCompleteeCoinData();
        
        // Use current coin price if available, otherwise load from API
        if (this.currentPrice <= 0) {
            await this.loadPairData();
        }
        this.updateDisplay();
        this.startPriceUpdates();
    }
    
    async loadCompleteeCoinData() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return;
            
            // Try to get more complete coin data from our API
            const response = await fetch('/api/coins/exchange', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.coins) {
                    // Find current coin in the API data
                    const apiCoin = result.coins.find(coin => 
                        coin.symbol.toUpperCase() === this.currentCoin.symbol.toUpperCase() ||
                        coin.id === this.currentCoin.id
                    );
                    
                    if (apiCoin) {
                        // Update current coin data with API data
                        this.currentCoin = {
                            ...this.currentCoin,
                            ...apiCoin,
                            // Preserve original symbol format
                            symbol: this.currentCoin.symbol
                        };
                        
                        // Update current price if available
                        if (apiCoin.price && apiCoin.price > 0) {
                            this.currentPrice = apiCoin.price;
                        }
                        
                        // Update pair data
                        this.currentPair.baseFullName = this.currentCoin.name;
                        
                        console.log(`Updated ${this.currentCoin.symbol} data from API:`, this.currentCoin);
                    }
                }
            }
        } catch (error) {
            console.log('Could not load complete coin data from API:', error.message);
        }
    }

    loadUserData() {
        // Load user balance
        const savedBalance = localStorage.getItem('spotBalance');
        if (savedBalance) {
            this.balance = { ...this.balance, ...JSON.parse(savedBalance) };
        }

        // Load portfolio
        const savedPortfolio = localStorage.getItem('spotPortfolio');
        if (savedPortfolio) {
            this.portfolio = JSON.parse(savedPortfolio);
        }

        // Load order history
        const savedHistory = localStorage.getItem('spotOrderHistory');
        if (savedHistory) {
            this.orderHistory = JSON.parse(savedHistory);
        }

        // Load reserved funds
        const savedReservedFunds = localStorage.getItem('spotReservedFunds');
        if (savedReservedFunds) {
            this.reservedFunds = JSON.parse(savedReservedFunds);
        } else {
            this.reservedFunds = {};
        }
    }

    saveUserData() {
        localStorage.setItem('spotBalance', JSON.stringify(this.balance));
        localStorage.setItem('spotPortfolio', JSON.stringify(this.portfolio));
        localStorage.setItem('spotOrderHistory', JSON.stringify(this.orderHistory));
        localStorage.setItem('spotReservedFunds', JSON.stringify(this.reservedFunds));
    }

    syncWithMainBalance() {
        // Update main user balance with USDT changes
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            user.balance = this.balance.USDT || 0;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Sync with server if available
            if (window.BalanceSync) {
                window.BalanceSync.updateServerBalance(user.balance);
            }
            
            // Trigger update on home page if it's open
            if (window.parent && window.parent.updateHomeBalance) {
                window.parent.updateHomeBalance();
            }
            
            // Broadcast balance change to other tabs/windows
            window.localStorage.setItem('balanceUpdate', Date.now().toString());
        }
    }

    setupEventListeners() {
        // Trade type tabs
        document.querySelectorAll('.trade-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode || e.target.closest('.trade-tab').dataset.mode;
                this.switchTradeType(mode);
            });
        });

        // Order type tabs
        document.querySelectorAll('.order-type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.target.dataset.type || e.target.closest('.order-type-tab').dataset.type;
                this.switchOrderType(type);
            });
        });

        // Amount input
        document.getElementById('amountInput')?.addEventListener('input', () => {
            this.calculateTotal();
        });

        // Total input
        document.getElementById('totalInput')?.addEventListener('input', () => {
            this.calculateAmount();
        });

        // Price input (for limit orders)
        document.getElementById('priceInput')?.addEventListener('input', () => {
            this.calculateTotal();
        });

        // Trade button
        document.getElementById('executeTradeBtn')?.addEventListener('click', () => {
            this.executeTrade();
        });
    }

    async loadPairData() {
        try {
            // Try multiple APIs for better coverage
            let priceLoaded = false;
            
            // First try Binance API for major coins
            if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOGE', 'XRP', 'DOT', 'AVAX', 'LINK', 'MATIC', 'UNI', 'LTC'].includes(this.currentPair.base)) {
                try {
                    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${this.currentPair.base}${this.currentPair.quote}`);
                    const data = await response.json();
                    
                    if (data.price) {
                        this.currentPrice = parseFloat(data.price);
                        priceLoaded = true;
                        console.log(`Loaded ${this.currentPair.base} price from Binance: ${this.currentPrice}`);
                    }
                } catch (error) {
                    console.log(`Binance API failed for ${this.currentPair.base}:`, error.message);
                }
            }
            
            // If Binance failed, try CoinGecko API
            if (!priceLoaded) {
                try {
                    const coinId = this.currentCoin.id || this.currentPair.base.toLowerCase();
                    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                    const data = await response.json();
                    
                    if (data[coinId] && data[coinId].usd) {
                        this.currentPrice = data[coinId].usd;
                        priceLoaded = true;
                        console.log(`Loaded ${this.currentPair.base} price from CoinGecko: ${this.currentPrice}`);
                    }
                } catch (error) {
                    console.log(`CoinGecko API failed for ${this.currentPair.base}:`, error.message);
                }
            }
            
            // If both APIs failed, use fallback prices
            if (!priceLoaded) {
                this.currentPrice = this.getFallbackPrice(this.currentPair.base);
                console.log(`Using fallback price for ${this.currentPair.base}: ${this.currentPrice}`);
            }
            
        } catch (error) {
            console.error('Error loading pair data:', error);
            // Use fallback price
            this.currentPrice = this.getFallbackPrice(this.currentPair.base);
            console.log(`Error fallback price for ${this.currentPair.base}: ${this.currentPrice}`);
        }
    }

    startPriceUpdates() {
        // Update price every 5 seconds
        setInterval(() => {
            this.loadPairData().then(() => {
                this.updatePriceDisplay();
                this.calculateTotal();
                // Check if any limit orders can be executed
                this.checkLimitOrders();
            });
        }, 5000);
    }

    checkLimitOrders() {
        // Check if any open limit orders can be executed based on current price
        let executedOrders = false;
        
        this.orderHistory.forEach(order => {
            if (order.status === 'open' && order.orderType === 'limit') {
                const canExecute = this.canExecuteLimitOrder(order);
                if (canExecute) {
                    this.executeLimitOrder(order);
                    executedOrders = true;
                    this.showNotification(`Лимитный ордер ${order.side === 'buy' ? 'покупки' : 'продажи'} выполнен по цене ${this.formatPrice(order.price)}`, 'success');
                }
            }
        });
        
        // Update display if any orders were executed
        if (executedOrders) {
            this.updateDisplay();
        }
    }

    updateDisplay() {
        this.updatePairDisplay();
        this.updateBalanceDisplay();
        this.updatePortfolioDisplay();
        this.updateOrderHistoryDisplay();
        this.updatePriceDisplay();
        this.updatePageTitle();
    }
    
    updatePageTitle() {
        // Update page title with current coin
        document.title = `${this.currentPair.baseFullName} Спот торговля - SellBit`;
        
        // Update header title
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = `${this.currentPair.base} Спот торговля`;
        }
    }

    updatePairDisplay() {
        const coinNameElement = document.getElementById('selectedCoinName');
        const coinSymbolElement = document.getElementById('selectedCoinSymbol');
        const coinIconElement = document.getElementById('selectedCoinIcon');
        const amountSuffixElement = document.getElementById('amountCurrency');
        
        if (coinNameElement) {
            coinNameElement.textContent = this.currentPair.baseFullName;
        }
        if (coinSymbolElement) {
            coinSymbolElement.textContent = `${this.currentPair.base}/${this.currentPair.quote}`;
        }
        if (coinIconElement) {
            // Use the existing logo system from logos.js
            if (window.CryptoLogos) {
                coinIconElement.src = window.CryptoLogos.getCoinLogoBySymbol(this.currentPair.base);
            } else {
                coinIconElement.src = `/logos/bitcoin.svg`; // fallback
            }
            coinIconElement.alt = this.currentPair.base;
            // Fallback for missing logo
            coinIconElement.onerror = function() {
                this.src = '/logos/default.svg';
            };
        }
        if (amountSuffixElement) {
            amountSuffixElement.textContent = this.currentPair.base;
        }
    }

    updatePriceDisplay() {
        const priceElement = document.getElementById('currentPrice');
        const priceChangeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = this.formatPrice(this.currentPrice);
        }
        
        if (priceChangeElement && this.currentCoin.price_change_percentage_24h !== undefined) {
            const change = this.currentCoin.price_change_percentage_24h;
            const isPositive = change >= 0;
            const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
            const sign = isPositive ? '+' : '';
            
            priceChangeElement.innerHTML = `
                <i class="fas ${icon}"></i>
                ${sign}${change.toFixed(2)}%
            `;
            priceChangeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
        }
    }

    updateBalanceDisplay() {
        const accountBalanceElement = document.getElementById('accountBalance');
        const portfolioAssetsElement = document.getElementById('portfolioAssets');
        
        if (accountBalanceElement) {
            const totalBalance = this.balance[this.currentPair.quote] || 0;
            accountBalanceElement.textContent = this.formatPrice(totalBalance);
        }
        
        if (portfolioAssetsElement) {
            this.updatePortfolioAssets(portfolioAssetsElement);
        }
    }

    updatePortfolioDisplay() {
        // This method is now called from updateBalanceDisplay
        const portfolioAssetsElement = document.getElementById('portfolioAssets');
        if (portfolioAssetsElement) {
            this.updatePortfolioAssets(portfolioAssetsElement);
        }
    }

    updatePortfolioAssets(container) {
        if (!container) return;
        
        // Show only the current trading asset
        const currentAssetSymbol = this.currentPair.base;
        const currentAssetAmount = this.balance[currentAssetSymbol] || 0;
        
        // Only show if we have a positive balance of the current asset
        if (currentAssetAmount > 0) {
            const usdValue = currentAssetAmount * this.currentPrice;
            
            container.innerHTML = `
                <div class="portfolio-asset">
                    <div class="asset-icon">
                        <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(currentAssetSymbol) : '/logos/default.svg'}" 
                             alt="${currentAssetSymbol}" 
                             onerror="this.src='/logos/default.svg'">
                    </div>
                    <div class="asset-info">
                        <div class="asset-symbol">${currentAssetSymbol}</div>
                        <div class="asset-amount">${this.formatAmount(currentAssetAmount)} ${currentAssetSymbol}</div>
                    </div>
                    <div class="asset-value">
                        <div class="usd-value">${this.formatPrice(usdValue)}</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="portfolio-empty">
                    <i class="fas fa-wallet"></i>
                    <p>Вы не владеете этим активом</p>
                    <span>Купите криптовалюту для торговли</span>
                </div>
            `;
        }
    }

    updateOrderHistoryDisplay() {
        const historyContainer = document.getElementById('recentOrdersList');
        if (!historyContainer) return;

        historyContainer.innerHTML = '';
        
        // Show last 5 orders
        const recentOrders = this.orderHistory.slice(-5).reverse();
        
        if (recentOrders.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <p>Нет недавних сделок</p>
                </div>
            `;
            return;
        }
        
        recentOrders.forEach(order => {
            // Determine order type display
            let orderTypeText = order.side === 'buy' ? 'Покупка' : 'Продажа';
            if (order.orderType === 'limit') {
                orderTypeText = order.side === 'buy' ? 'Лимит покупки' : 'Лимит продажи';
            }
            
            // Determine status display
            let statusClass = '';
            let statusText = '';
            if (order.status === 'open') {
                statusClass = 'pending';
                statusText = 'Открыт';
            } else if (order.status === 'filled') {
                statusClass = 'completed';
                statusText = 'Исполнен';
            } else {
                statusClass = 'failed';
                statusText = 'Отменен';
            }
            
            const item = document.createElement('div');
            item.className = 'order-item';
            item.innerHTML = `
                <div class="order-left">
                    <div class="order-pair">${order.pair}</div>
                    <div class="order-details">
                        <span class="order-type ${order.side}">${orderTypeText}</span>
                        <span class="order-time">${this.formatTime(order.timestamp)}</span>
                    </div>
                </div>
                <div class="order-right">
                    <div class="order-amount">${this.formatAmount(order.amount)} ${order.baseAsset}</div>
                    <div class="order-total">${this.formatPrice(order.total)}</div>
                    <div class="order-status ${statusClass}">${statusText}</div>
                </div>
            `;
            historyContainer.appendChild(item);
        });
    }

    switchTradeType(mode) {
        this.tradeType = mode;
        
        // Update active tab
        document.querySelectorAll('.trade-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Update form
        this.updateTradeForm();
        this.calculateTotal();
    }

    switchOrderType(type) {
        this.orderType = type;
        
        // Update active tab
        document.querySelectorAll('.order-type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        // Show/hide limit price input
        const priceInputGroup = document.getElementById('priceInputGroup');
        if (priceInputGroup) {
            priceInputGroup.style.display = type === 'limit' ? 'block' : 'none';
        }

        this.calculateTotal();
    }

    updateTradeForm() {
        const tradeButton = document.getElementById('executeTradeBtn');
        const tradeBtnText = document.getElementById('tradeBtnText');
        
        if (tradeButton) {
            tradeButton.className = `trade-execute-btn ${this.tradeType}`;
        }
        
        if (tradeBtnText) {
            tradeBtnText.textContent = this.tradeType === 'buy' ? 
                `Купить` : 
                `Продать`;
        }

        // Update button state
        this.updateTradeButtonState();
    }

    setPercentage(percent) {
        const asset = this.tradeType === 'buy' ? this.currentPair.quote : this.currentPair.base;
        const availableBalance = this.balance[asset] || 0;
        
        let amount;
        if (this.tradeType === 'buy') {
            // Calculate amount based on available quote balance
            const availableTotal = availableBalance * (percent / 100);
            amount = availableTotal / this.currentPrice;
        } else {
            // Calculate amount based on available base balance
            amount = availableBalance * (percent / 100);
        }

        const amountInput = document.getElementById('amountInput');
        if (amountInput) {
            amountInput.value = this.formatAmount(amount);
            this.calculateTotal();
        }
    }

    calculateTotal() {
        const amountInput = document.getElementById('amountInput');
        const totalInput = document.getElementById('totalInput');
        const feeElement = document.getElementById('feeAmount');
        const finalTotalElement = document.getElementById('finalTotal');
        
        if (!amountInput || !totalInput) return;

        const amount = parseFloat(amountInput.value) || 0;
        const price = this.orderType === 'limit' ? 
            (parseFloat(document.getElementById('priceInput')?.value) || this.currentPrice) : 
            this.currentPrice;

        const total = amount * price;
        const fee = total * this.fees.taker;
        const finalTotal = this.tradeType === 'buy' ? total + fee : total - fee;

        totalInput.value = total.toFixed(2);
        
        if (feeElement) {
            feeElement.textContent = this.formatPrice(fee);
        }
        
        if (finalTotalElement) {
            finalTotalElement.textContent = this.formatPrice(finalTotal);
        }
        
        this.updateTradeButtonState();
    }

    calculateAmount() {
        const amountInput = document.getElementById('amountInput');
        const totalInput = document.getElementById('totalInput');
        
        if (!amountInput || !totalInput) return;

        const total = parseFloat(totalInput.value) || 0;
        const price = this.orderType === 'limit' ? 
            (parseFloat(document.getElementById('priceInput')?.value) || this.currentPrice) : 
            this.currentPrice;

        if (price > 0) {
            const amount = total / price;
            amountInput.value = amount.toFixed(8);
        }
        
        this.updateTradeButtonState();
    }

    async executeTrade() {
        const amount = parseFloat(document.getElementById('amountInput')?.value) || 0;
        const price = this.orderType === 'limit' ? 
            (parseFloat(document.getElementById('priceInput')?.value) || this.currentPrice) : 
            this.currentPrice;

        if (amount <= 0) {
            this.showNotification('Введите корректное количество', 'error');
            return;
        }

        const total = amount * price;
        const fee = total * this.fees.taker;

        // Check balance
        if (this.tradeType === 'buy') {
            const requiredBalance = total + fee;
            if ((this.balance[this.currentPair.quote] || 0) < requiredBalance) {
                this.showNotification('Недостаточно средств', 'error');
                return;
            }
        } else {
            if ((this.balance[this.currentPair.base] || 0) < amount) {
                this.showNotification('Недостаточно средств', 'error');
                return;
            }
        }

        if (this.orderType === 'limit') {
            // Handle limit order - add to order book instead of immediate execution
            await this.placeLimitOrder(amount, price, fee, total);
        } else {
            // Handle market order - execute immediately
            await this.executeMarketOrder(amount, price, fee, total);
        }
    };

    async placeLimitOrder(amount, price, fee, total) {
        // For limit orders, we add them to the order book instead of executing immediately
        // In a real exchange, this would go to a matching engine
        
        // Create limit order
        const order = {
            id: Date.now().toString(),
            pair: `${this.currentPair.base}/${this.currentPair.quote}`,
            side: this.tradeType,
            amount: amount,
            price: price,
            total: total,
            fee: fee,
            baseAsset: this.currentPair.base,
            quoteAsset: this.currentPair.quote,
            timestamp: new Date(),
            status: 'open', // Limit orders start as open
            orderType: 'limit'
        };

        // Add to order history
        this.orderHistory.push(order);
        
        // For simulation purposes, we'll check if the order can be executed immediately
        // based on current market price
        const canExecute = this.canExecuteLimitOrder(order);
        
        if (canExecute) {
            // Execute the limit order immediately
            await this.executeLimitOrder(order);
            this.showNotification(`Лимитный ордер выполнен по цене ${this.formatPrice(price)}`, 'success');
        } else {
            // Add to open orders and reserve funds
            this.reserveFundsForOrder(order);
            this.showNotification(`Лимитный ордер размещен в стакане по цене ${this.formatPrice(price)}`, 'info');
        }
        
        // Save data
        this.saveUserData();
        
        // Update display
        this.updateDisplay();
        
        // Clear form
        document.getElementById('amountInput').value = '';
        document.getElementById('totalInput').value = '';
        if (document.getElementById('priceInput')) {
            document.getElementById('priceInput').value = '';
        }
        
        // Show order placed modal instead of success modal for limit orders
        this.showOrderPlacedModal(order);
    }

    async executeMarketOrder(amount, price, fee, total) {
        // Execute trade immediately
        if (this.tradeType === 'buy') {
            // Deduct quote currency and fee
            this.balance[this.currentPair.quote] -= (total + fee);
            // Add base currency
            this.balance[this.currentPair.base] = (this.balance[this.currentPair.base] || 0) + amount;
        } else {
            // Deduct base currency
            this.balance[this.currentPair.base] -= amount;
            // Add quote currency minus fee
            this.balance[this.currentPair.quote] = (this.balance[this.currentPair.quote] || 0) + (total - fee);
        }

        // Add to order history
        const order = {
            id: Date.now().toString(),
            pair: `${this.currentPair.base}/${this.currentPair.quote}`,
            side: this.tradeType,
            amount: amount,
            price: price,
            total: total,
            fee: fee,
            baseAsset: this.currentPair.base,
            quoteAsset: this.currentPair.quote,
            timestamp: new Date(),
            status: 'filled',
            orderType: 'market'
        };

        this.orderHistory.push(order);
        
        // Save data
        this.saveUserData();
        
        // Sync with main user balance
        this.syncWithMainBalance();
        
        // Update display
        this.updateDisplay();
        
        // Clear form
        document.getElementById('amountInput').value = '';
        document.getElementById('totalInput').value = '';
        if (document.getElementById('priceInput')) {
            document.getElementById('priceInput').value = '';
        }

        // Show success modal
        this.showSuccessModal(order);
    }

    canExecuteLimitOrder(order) {
        // Check if a limit order can be executed immediately based on current market price
        if (order.side === 'buy') {
            // Buy limit order can execute if current price is less than or equal to limit price
            return this.currentPrice <= order.price;
        } else {
            // Sell limit order can execute if current price is greater than or equal to limit price
            return this.currentPrice >= order.price;
        }
    }

    reserveFundsForOrder(order) {
        // Reserve funds for limit orders (they don't execute immediately)
        if (order.side === 'buy') {
            // Reserve quote currency for buy orders
            const requiredBalance = order.total + order.fee;
            this.balance[this.currentPair.quote] -= requiredBalance;
            // Store reserved amount for potential cancellation
            if (!this.reservedFunds) this.reservedFunds = {};
            this.reservedFunds[order.id] = {
                asset: this.currentPair.quote,
                amount: requiredBalance
            };
        } else {
            // Reserve base currency for sell orders
            this.balance[this.currentPair.base] -= order.amount;
            // Store reserved amount for potential cancellation
            if (!this.reservedFunds) this.reservedFunds = {};
            this.reservedFunds[order.id] = {
                asset: this.currentPair.base,
                amount: order.amount
            };
        }
    }

    releaseReservedFunds(orderId) {
        // Release reserved funds when order is cancelled or fully executed
        if (this.reservedFunds && this.reservedFunds[orderId]) {
            const reserved = this.reservedFunds[orderId];
            this.balance[reserved.asset] = (this.balance[reserved.asset] || 0) + reserved.amount;
            delete this.reservedFunds[orderId];
        }
    }

    cancelOrder(orderId) {
        // Cancel an open order and release reserved funds
        const orderIndex = this.orderHistory.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const order = this.orderHistory[orderIndex];
            if (order.status === 'open') {
                // Update order status
                this.orderHistory[orderIndex].status = 'cancelled';
                
                // Release reserved funds
                this.releaseReservedFunds(orderId);
                
                // Save data and update display
                this.saveUserData();
                this.updateDisplay();
                
                this.showNotification(`Ордер отменен`, 'info');
                return true;
            }
        }
        return false;
    }

    async executeLimitOrder(order) {
        // Execute a limit order that has been matched
        const orderId = order.id;
        
        // Update order status
        const orderIndex = this.orderHistory.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            this.orderHistory[orderIndex].status = 'filled';
        }
        
        // Release reserved funds
        this.releaseReservedFunds(orderId);
        
        // Execute the trade
        if (order.side === 'buy') {
            // Add base currency
            this.balance[this.currentPair.base] = (this.balance[this.currentPair.base] || 0) + order.amount;
        } else {
            // Add quote currency minus fee
            const netAmount = order.total - order.fee;
            this.balance[this.currentPair.quote] = (this.balance[this.currentPair.quote] || 0) + netAmount;
        }
        
        // Sync with main user balance
        this.syncWithMainBalance();
        
        // Save data
        this.saveUserData();
        
        // Update display
        this.updateDisplay();
    }

    showSuccessModal(order) {
        const modal = document.getElementById('successModal');
        const successDetails = document.getElementById('successDetails');
        const successTitle = document.getElementById('successTitle');
        const successMessage = document.getElementById('successMessage');
        
        if (modal) {
            if (successTitle) {
                successTitle.textContent = order.side === 'buy' ? 'Покупка выполнена!' : 'Продажа выполнена!';
            }
            
            if (successMessage) {
                successMessage.textContent = `Ваша ${order.side === 'buy' ? 'покупка' : 'продажа'} успешно завершена`;
            }
            
            if (successDetails) {
                successDetails.innerHTML = `
                    <div class="success-order-item">
                        <span>Пара:</span>
                        <span>${order.pair}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Количество:</span>
                        <span>${this.formatAmount(order.amount)} ${order.baseAsset}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Цена:</span>
                        <span>${this.formatPrice(order.price)}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Общая сумма:</span>
                        <span>${this.formatPrice(order.total)}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Комиссия:</span>
                        <span>${this.formatPrice(order.fee)}</span>
                    </div>
                `;
            }
            
            modal.style.display = 'flex';
        }
    }

    showOrderPlacedModal(order) {
        const modal = document.getElementById('successModal');
        const successDetails = document.getElementById('successDetails');
        const successTitle = document.getElementById('successTitle');
        const successMessage = document.getElementById('successMessage');
        
        if (modal) {
            if (successTitle) {
                successTitle.textContent = order.side === 'buy' ? 'Лимитный ордер на покупку размещен!' : 'Лимитный ордер на продажу размещен!';
            }
            
            if (successMessage) {
                successMessage.textContent = `Ваш лимитный ордер размещен в стакане`;
            }
            
            if (successDetails) {
                successDetails.innerHTML = `
                    <div class="success-order-item">
                        <span>Пара:</span>
                        <span>${order.pair}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Тип:</span>
                        <span>Лимитный</span>
                    </div>
                    <div class="success-order-item">
                        <span>Количество:</span>
                        <span>${this.formatAmount(order.amount)} ${order.baseAsset}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Цена:</span>
                        <span>${this.formatPrice(order.price)}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Общая сумма:</span>
                        <span>${this.formatPrice(order.total)}</span>
                    </div>
                    <div class="success-order-item">
                        <span>Статус:</span>
                        <span>Открыт</span>
                    </div>
                `;
            }
            
            modal.style.display = 'flex';
        }
    }

    calculatePortfolioValue() {
        let total = 0;
        Object.entries(this.balance).forEach(([symbol, amount]) => {
            if (amount > 0) {
                if (symbol === 'USDT') {
                    total += amount;
                } else {
                    // Use current price for the current coin, 1 for others as placeholder
                    const price = symbol === this.currentPair.base ? this.currentPrice : 1;
                    total += amount * price;
                }
            }
        });
        return total;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification - you can enhance this
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : '#44ff44'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateTradeButtonState() {
        const tradeButton = document.getElementById('executeTradeBtn');
        const amountInput = document.getElementById('amountInput');
        
        if (!tradeButton || !amountInput) return;
        
        const amount = parseFloat(amountInput.value) || 0;
        const hasValidAmount = amount > 0;
        
        tradeButton.disabled = !hasValidAmount;
        tradeButton.style.opacity = hasValidAmount ? '1' : '0.5';
    }

    setPercentage(percent) {
        const asset = this.tradeType === 'buy' ? this.currentPair.quote : this.currentPair.base;
        const availableBalance = this.balance[asset] || 0;
        
        let amount;
        if (this.tradeType === 'buy') {
            // Calculate amount based on available quote balance
            const availableTotal = availableBalance * (percent / 100);
            // Account for fees when buying
            const adjustedTotal = availableTotal / (1 + this.fees.taker);
            amount = adjustedTotal / this.currentPrice;
        } else {
            // Calculate amount based on available base balance
            amount = availableBalance * (percent / 100);
        }

        const amountInput = document.getElementById('amountInput');
        if (amountInput && amount > 0) {
            amountInput.value = amount.toFixed(8);
            this.calculateTotal();
        }
    }

    formatPrice(price) {
        if (price >= 1) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(price);
        } else {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 4,
                maximumFractionDigits: 6
            }).format(price);
        }
    }

    formatAmount(amount) {
        if (amount >= 1) {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
            }).format(amount);
        } else {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
            }).format(amount);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.spotTrading = new SpotTrading();
});

// Global functions for HTML event handlers
function switchTradeMode(mode) {
    if (window.spotTrading) {
        window.spotTrading.switchTradeType(mode);
    }
}

function switchOrderType(type) {
    if (window.spotTrading) {
        window.spotTrading.switchOrderType(type);
    }
}

function setPercentage(percent) {
    if (window.spotTrading) {
        window.spotTrading.setPercentage(percent);
    }
}

function calculateTotal() {
    if (window.spotTrading) {
        window.spotTrading.calculateTotal();
    }
}

function calculateAmount() {
    if (window.spotTrading) {
        window.spotTrading.calculateAmount();
    }
}

function executeTrade() {
    if (window.spotTrading) {
        window.spotTrading.executeTrade();
    }
}

function openPairSelector() {
    // Coin selection removed - spot trading uses current coin only
    console.log('Coin selection disabled for spot trading');
}

function closePairSelector() {
    // Modal not needed anymore
    console.log('Pair selector modal removed');
}

function closeSuccessModal() {
    if (window.spotTrading) {
        window.spotTrading.closeModal('successModal');
    }
}

function refreshBalance() {
    if (window.spotTrading) {
        window.spotTrading.updateDisplay();
        window.spotTrading.showNotification('Баланс обновлен', 'success');
    }
}

function viewAllOrders() {
    // Show all orders in a modal with cancellation capability
    const orders = window.spotTrading.orderHistory.slice().reverse();
    
    if (orders.length === 0) {
        window.spotTrading.showNotification('Нет ордеров', 'info');
        return;
    }
    
    // Create a simple modal to show all orders
    let ordersHtml = '';
    orders.forEach(order => {
        // Determine order type display
        let orderTypeText = order.side === 'buy' ? 'Покупка' : 'Продажа';
        if (order.orderType === 'limit') {
            orderTypeText = order.side === 'buy' ? 'Лимит покупки' : 'Лимит продажи';
        }
        
        // Determine status display
        let statusText = '';
        if (order.status === 'open') {
            statusText = 'Открыт';
        } else if (order.status === 'filled') {
            statusText = 'Исполнен';
        } else {
            statusText = 'Отменен';
        }
        
        // Add cancel button for open orders
        const cancelButton = order.status === 'open' ? 
            `<button class="cancel-order-btn" onclick="cancelSpecificOrder('${order.id}')" style="margin-left: 10px; background: #f87171; color: #0f172a; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">Отменить</button>` : '';
        
        ordersHtml += `
            <div style="padding: 10px; border-bottom: 1px solid #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${order.pair}</strong> - ${orderTypeText}
                        <div style="font-size: 14px; color: #94a3b8;">
                            Количество: ${window.spotTrading.formatAmount(order.amount)} ${order.baseAsset} | 
                            Цена: ${window.spotTrading.formatPrice(order.price)} | 
                            Статус: ${statusText}
                        </div>
                    </div>
                    ${cancelButton}
                </div>
            </div>
        `;
    });
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'allOrdersModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: #1e293b; border-radius: 16px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
            <div style="padding: 20px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #e6f1ff;">Все ордера</h3>
                <button onclick="closeAllOrdersModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div style="padding: 20px;">
                ${ordersHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function cancelSpecificOrder(orderId) {
    if (window.spotTrading && window.spotTrading.cancelOrder(orderId)) {
        // Remove the order from the modal display
        const modal = document.getElementById('allOrdersModal');
        if (modal) {
            // Refresh the modal
            closeAllOrdersModal();
            viewAllOrders();
        }
    }
}

function closeAllOrdersModal() {
    const modal = document.getElementById('allOrdersModal');
    if (modal) {
        modal.remove();
    }
}

// Navigation function
function goToTrading() {
    window.location.href = 'coininfo.html';
}

function goBack() {
    window.history.back();
}