// Portfolio Page JavaScript

class PortfolioPage {
    constructor() {
        this.currentCurrency = 'usd';
        this.balanceChart = null;
        this.init();
    }

    init() {
        this.loadPortfolioData();
        this.initializeChart();
        this.bindEvents();
        this.updateUserAvatar();
        this.initializePortfolioForZeroBalanceAccounts();
    }

    bindEvents() {
        // Listen for balance updates
        window.addEventListener('storage', (e) => {
            if (e.key === 'user' || e.key === 'spotBalance' || e.key === 'futuresPositions' || e.key === 'spotOrderHistory') {
                this.loadPortfolioData();
            }
        });
    }

    // Initialize portfolio for zero balance accounts
    initializePortfolioForZeroBalanceAccounts() {
        // Ensure portfolio data is preserved even for zero balance accounts
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // If user has zero balance but has positions, preserve them
        if (user.balance === 0) {
            // Get existing positions and orders
            const futuresPositions = JSON.parse(localStorage.getItem('futuresPositions') || '[]');
            const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory') || '[]');
            
            // Save portfolio data for zero balance accounts
            const zeroBalancePortfolio = {
                futuresPositions: futuresPositions,
                spotOrderHistory: spotOrderHistory,
                timestamp: Date.now()
            };
            
            localStorage.setItem('zeroBalancePortfolio', JSON.stringify(zeroBalancePortfolio));
        }
    }

    // Load all portfolio data
    loadPortfolioData() {
        this.updateBalance();
        this.loadAssets();
        this.loadActiveOrders();
        this.loadFuturesPositions();
        this.loadHistory();
        this.loadNotifications();
    }

    // Update user avatar
    updateUserAvatar() {
        const user = JSON.parse(localStorage.getItem('user'));
        const avatar = document.getElementById('userAvatar');
        if (user && avatar) {
            avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : user.username ? user.username.charAt(0).toUpperCase() : 'U';
        }
    }

    // Update total balance
    updateBalance() {
        const user = JSON.parse(localStorage.getItem('user'));
        const spotBalance = JSON.parse(localStorage.getItem('spotBalance') || '{}');
        const futuresPositions = JSON.parse(localStorage.getItem('futuresPositions') || '[]');
        
        let totalBalance = user ? user.balance || 0 : 0;
        
        // Add spot crypto balances (convert to USD)
        Object.keys(spotBalance).forEach(coin => {
            if (coin !== 'USDT') {
                // Get current price from localStorage coins data
                const coinsData = JSON.parse(localStorage.getItem('coinsData') || '[]');
                const coinData = coinsData.find(c => c.symbol === coin);
                const price = coinData ? coinData.current_price || 0 : 0;
                totalBalance += (spotBalance[coin] || 0) * price;
            } else {
                totalBalance += spotBalance[coin] || 0;
            }
        });
        
        // Add futures positions PnL
        futuresPositions.forEach(position => {
            totalBalance += position.pnl || 0;
        });
        
        // Update display
        const balanceElement = document.getElementById('totalBalance');
        if (balanceElement) {
            if (this.currentCurrency === 'usd') {
                balanceElement.textContent = `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
                // Convert to BTC (assuming 1 BTC = $60,000 for demo)
                const btcValue = totalBalance / 60000;
                balanceElement.textContent = `${btcValue.toFixed(6)} BTC`;
            }
        }
        
        // Update balance change (demo data)
        const changeElement = document.getElementById('balanceChange');
        const changePercentElement = document.getElementById('balanceChangePercent');
        if (changeElement && changePercentElement) {
            const change = Math.random() > 0.5 ? Math.random() * 2 : -Math.random() * 2;
            changePercentElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElement.className = change >= 0 ? 'balance-change positive' : 'balance-change negative';
        }
    }

    // Toggle balance currency display
    toggleBalanceCurrency(currency) {
        this.currentCurrency = currency;
        
        // Update toggle buttons
        const usdToggle = document.getElementById('usdToggle');
        const btcToggle = document.getElementById('btcToggle');
        
        if (usdToggle && btcToggle) {
            usdToggle.classList.toggle('active', currency === 'usd');
            btcToggle.classList.toggle('active', currency === 'btc');
        }
        
        this.updateBalance();
        this.updateChart();
    }

    // Initialize balance chart
    initializeChart() {
        const canvas = document.getElementById('balanceChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['7д', '6д', '5д', '4д', '3д', '2д', '1д', 'Сегодня'],
                datasets: [{
                    label: 'Баланс',
                    data: [9500, 9800, 9700, 10200, 10100, 10500, 10300, 10450],
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2
                    }
                }
            }
        });
    }

    // Update chart data
    updateChart() {
        if (!this.balanceChart) return;
        
        // Generate demo data
        const data = [];
        let currentValue = this.currentCurrency === 'usd' ? 10000 : 0.16;
        for (let i = 7; i >= 0; i--) {
            const change = (Math.random() - 0.5) * 0.1;
            currentValue = currentValue * (1 + change);
            data.unshift(parseFloat(currentValue.toFixed(2)));
        }
        
        this.balanceChart.data.datasets[0].data = data;
        this.balanceChart.update();
    }

    // Load asset structure
    loadAssets() {
        const tableBody = document.getElementById('assetsTableBody');
        if (!tableBody) return;
        
        const spotBalance = JSON.parse(localStorage.getItem('spotBalance') || '{}');
        const coinsData = JSON.parse(localStorage.getItem('coinsData') || '[]');
        
        // Get all unique coins
        const allCoins = new Set([...Object.keys(spotBalance)]);
        
        if (allCoins.size === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Нет активов</td></tr>';
            return;
        }
        
        let html = '';
        allCoins.forEach(coin => {
            const balance = spotBalance[coin] || 0;
            const coinData = coinsData.find(c => c.symbol === coin);
            const price = coinData ? coinData.current_price || 0 : (coin === 'USDT' ? 1 : 0);
            const value = balance * price;
            const pnl = Math.random() > 0.5 ? Math.random() * 5 : -Math.random() * 5; // Demo PnL
            
            html += `
                <tr>
                    <td>
                        <div class="asset-info">
                            <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coin) : '/logos/default.svg'}" 
                                 alt="${coin}" class="asset-icon" onerror="this.src='/logos/default.svg'">
                            <div>
                                <div class="asset-name">${coin}</div>
                            </div>
                        </div>
                    </td>
                    <td>${balance.toFixed(6)}</td>
                    <td>$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    // Load active orders
    loadActiveOrders() {
        const tableBody = document.getElementById('ordersTableBody');
        if (!tableBody) return;
        
        // Get orders from localStorage
        const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory') || '[]');
        const activeOrders = spotOrderHistory.filter(order => order.status === 'open');
        
        if (activeOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">Нет активных ордеров</td></tr>';
            return;
        }
        
        let html = '';
        activeOrders.forEach(order => {
            html += `
                <tr>
                    <td>${order.pair}</td>
                    <td>
                        <span class="order-type ${order.type.toLowerCase()}">${order.type}</span>
                    </td>
                    <td>$${order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${order.amount}</td>
                    <td>
                        <span class="order-status ${order.status === 'open' ? 'open' : 'partial'}">${order.status}</span>
                    </td>
                    <td>
                        <button class="cancel-btn" onclick="cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    // Load futures positions
    loadFuturesPositions() {
        const tableBody = document.getElementById('positionsTableBody');
        if (!tableBody) return;
        
        const positions = JSON.parse(localStorage.getItem('futuresPositions') || '[]');
        
        if (positions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Нет открытых позиций</td></tr>';
            return;
        }
        
        let html = '';
        positions.forEach(position => {
            const pnlPercent = position.margin > 0 ? (position.pnl / position.margin) * 100 : 0;
            
            html += `
                <tr>
                    <td>${position.pair}</td>
                    <td>
                        <span class="position-direction ${position.direction}">${position.direction === 'long' ? 'Long' : 'Short'}</span>
                    </td>
                    <td>x${position.leverage}</td>
                    <td>$${position.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="${position.pnl >= 0 ? 'positive' : 'negative'}">
                        $${position.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                        (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                    </td>
                    <td>$${position.liquidationPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                        <div class="position-actions">
                            <button class="close-btn" onclick="closePosition('${position.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="sl-tp-btn" onclick="setSlTp('${position.id}')">
                                <i class="fas fa-sliders-h"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    // Load history data
    loadHistory() {
        this.loadTradesHistory();
        this.loadOrdersHistory();
    }

    // Load trades history
    loadTradesHistory() {
        const tbody = document.getElementById('tradesHistoryBody');
        if (!tbody) return;
        
        // Get spot trading history
        const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory') || '[]');
        const completedOrders = spotOrderHistory.filter(order => order.status === 'filled');
        
        if (completedOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Нет истории сделок</td></tr>';
            return;
        }
        
        let html = '';
        completedOrders.forEach(order => {
            html += `
                <tr>
                    <td>${order.pair}</td>
                    <td>
                        <span class="trade-type ${order.side}">${order.side === 'buy' ? 'Buy' : 'Sell'}</span>
                    </td>
                    <td>$${order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${order.amount}</td>
                    <td>${new Date(order.timestamp).toLocaleTimeString('ru-RU')}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    // Load orders history
    loadOrdersHistory() {
        const tbody = document.getElementById('ordersHistoryBody');
        if (!tbody) return;
        
        // Get all orders from localStorage
        const spotOrderHistory = JSON.parse(localStorage.getItem('spotOrderHistory') || '[]');
        
        if (spotOrderHistory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">Нет истории ордеров</td></tr>';
            return;
        }
        
        let html = '';
        spotOrderHistory.forEach(order => {
            html += `
                <tr>
                    <td>${order.pair}</td>
                    <td>
                        <span class="order-type ${order.side}">${order.side === 'buy' ? 'Buy' : 'Sell'}</span>
                    </td>
                    <td>$${order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${order.amount}</td>
                    <td>
                        <span class="order-status ${order.status === 'filled' ? 'filled' : order.status === 'cancelled' ? 'cancelled' : 'open'}">${order.status}</span>
                    </td>
                    <td>${new Date(order.timestamp).toLocaleTimeString('ru-RU')}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    // Load notifications
    loadNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        // Demo notifications
        const notifications = [
            { id: 1, type: 'info', message: 'Ордер на покупку BTC исполнен', time: '15:30' },
            { id: 2, type: 'warning', message: 'Фьючерсная позиция BTC близка к ликвидации', time: '14:45' },
            { id: 3, type: 'success', message: 'Средства успешно переведены', time: '12:20' }
        ];
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Нет уведомлений</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        notifications.forEach(notification => {
            html += `
                <div class="notification-item ${notification.type}">
                    <div class="notification-content">
                        <i class="fas fa-${notification.type === 'warning' ? 'exclamation-triangle' : notification.type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                        <div class="notification-message">${notification.message}</div>
                    </div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Switch history tab
    switchHistoryTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }
}

// Global functions
function toggleBalanceCurrency(currency) {
    if (window.portfolioPage) {
        window.portfolioPage.toggleBalanceCurrency(currency);
    }
}

function switchHistoryTab(tabName) {
    if (window.portfolioPage) {
        window.portfolioPage.switchHistoryTab(tabName);
    }
}

function goToSpotTrading() {
    window.location.href = 'spot-trading.html';
}

// Close futures position
function closePosition(positionId) {
    const positions = JSON.parse(localStorage.getItem('futuresPositions') || '[]');
    const positionIndex = positions.findIndex(p => p.id == positionId);
    
    if (positionIndex !== -1) {
        const position = positions[positionIndex];
        
        // Get user data
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            // Return margin + PnL to user balance
            user.balance += position.margin + (position.pnl || 0);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Remove position from array
            positions.splice(positionIndex, 1);
            localStorage.setItem('futuresPositions', JSON.stringify(positions));
            
            // Refresh portfolio
            if (window.portfolioPage) {
                window.portfolioPage.loadPortfolioData();
            }
            
            showToast(`Позиция ${position.pair} закрыта`, 'success');
        }
    } else {
        showToast('Позиция не найдена', 'error');
    }
}

// Cancel spot order
function cancelOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('spotOrderHistory') || '[]');
    const orderIndex = orders.findIndex(o => o.id == orderId);
    
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        
        // Only cancel open orders
        if (order.status === 'open') {
            // Get user data
            const user = JSON.parse(localStorage.getItem('user'));
            const spotBalance = JSON.parse(localStorage.getItem('spotBalance') || '{}');
            
            if (user) {
                if (order.side === 'buy') {
                    // Return quote currency (USDT) to balance
                    const total = order.total || (order.amount * order.price);
                    const fee = order.fee || (total * 0.001);
                    const amountToReturn = total + fee;
                    
                    user.balance += amountToReturn;
                    spotBalance.USDT = (spotBalance.USDT || 0) + amountToReturn;
                } else {
                    // Return base currency to balance
                    spotBalance[order.baseAsset] = (spotBalance[order.baseAsset] || 0) + order.amount;
                }
                
                // Update order status
                orders[orderIndex].status = 'cancelled';
                
                // Save updated data
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('spotBalance', JSON.stringify(spotBalance));
                localStorage.setItem('spotOrderHistory', JSON.stringify(orders));
                
                // Refresh portfolio
                if (window.portfolioPage) {
                    window.portfolioPage.loadPortfolioData();
                }
                
                showToast(`Ордер ${order.pair} отменен`, 'success');
            }
        } else {
            showToast('Ордер уже исполнен или отменен', 'error');
        }
    } else {
        showToast('Ордер не найден', 'error');
    }
}

function transferFunds() {
    showToast('Функция в разработке', 'info');
}

function setSlTp(positionId) {
    showToast(`Настройка SL/TP для позиции ${positionId}`, 'info');
}

function goBack() {
    window.history.back();
}

function openNotifications() {
    showToast('Уведомления откроются в следующем обновлении', 'info');
}

function showToast(message, type = 'info') {
    if (window.notificationManager) {
        window.notificationManager.show(message, type);
    } else {
        // Fallback toast implementation
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.portfolioPage = new PortfolioPage();
});