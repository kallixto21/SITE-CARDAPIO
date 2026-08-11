/**
 * App.js - Ponto 45 Food
 */

const App = {
    state: {
        restaurantInfo: null,
        menuData: [],
        categories: [],
        cart: [],
        currentItem: null,
        currentQty: 1
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadData();
        this.checkScroll();
    },

    cacheDOM() {
        this.menuContainer = document.getElementById('menu-container');
        this.catList = document.getElementById('category-list');
        this.cartCount = document.getElementById('cart-count');
        this.cartDrawer = document.getElementById('cart-drawer');
        this.cartOverlay = document.getElementById('cart-overlay');
        this.cartItemsContainer = document.getElementById('cart-items-container');
        this.cartSubtotal = document.getElementById('cart-subtotal');
        this.cartFee = document.getElementById('cart-fee');
        this.cartTotal = document.getElementById('cart-total');
        this.btnCheckout = document.getElementById('btn-checkout');
        this.toastContainer = document.getElementById('toast-container');
        this.fabTop = document.getElementById('fab-top');
        
        this.itemModal = document.getElementById('item-modal');
        this.checkoutModal = document.getElementById('checkout-modal');
    },

    bindEvents() {
        document.getElementById('modal-qty-plus').addEventListener('click', () => this.updateModalQty(1));
        document.getElementById('modal-qty-minus').addEventListener('click', () => this.updateModalQty(-1));
        document.getElementById('modal-add-btn').addEventListener('click', () => this.addToCart());
        document.getElementById('close-item-modal').addEventListener('click', () => this.closeItemModal());

        document.getElementById('open-cart-btn').addEventListener('click', () => this.openCart());
        document.getElementById('close-cart-btn').addEventListener('click', () => this.closeCart());
        this.cartOverlay.addEventListener('click', () => { this.closeCart(); this.checkoutModal.close(); });
        
        this.btnCheckout.addEventListener('click', () => this.openCheckoutModal());
        document.getElementById('close-checkout-modal').addEventListener('click', () => this.checkoutModal.close());
        document.getElementById('c-payment').addEventListener('change', (e) => {
            document.getElementById('change-group').classList.toggle('hidden', e.target.value !== 'Dinheiro');
        });
        document.getElementById('checkout-form').addEventListener('submit', (e) => this.finalizeOrder(e));

        window.addEventListener('scroll', () => this.checkScroll());
        this.fabTop.addEventListener('click', () => window.scrollTo(0,0));
    },

    async loadData() {
        try {
            const response = await fetch('./menu.json');
            const data = await response.json();
            
            this.state.restaurantInfo = data.restaurant;
            this.state.categories = data.categories;
            this.state.menuData = data.items;

            document.getElementById('delivery-time-info').innerText = `⏳ ${data.restaurant.deliveryTime}`;
            document.getElementById('delivery-fee-info').innerText = `🛵 Taxa: ${this.formatCurrency(data.restaurant.deliveryFee)}`;
            
            this.renderCategories();
            this.renderMenu();
        } catch (error) {
            console.error("Erro ao carregar cardápio:", error);
            this.menuContainer.innerHTML = '<p style="text-align:center; padding: 40px;">Erro ao carregar o cardápio. Atualize a página.</p>';
        }
    },

    renderCategories() {
        this.catList.innerHTML = this.state.categories.map((cat, index) => `
            <a href="#cat-${cat.id}" class="cat-btn ${index === 0 ? 'active' : ''}">${cat.name}</a>
        `).join('');

        this.catList.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.catList.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const targetId = e.target.getAttribute('href').substring(1);
                const el = document.getElementById(targetId);
                if(el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 130;
                    window.scrollTo({top: y, behavior: 'smooth'});
                }
            });
        });
    },

    renderMenu() {
        this.menuContainer.innerHTML = '';
        
        this.state.categories.forEach(cat => {
            const items = this.state.menuData.filter(i => i.categoryId === cat.id);
            if (items.length === 0) return;

            const section = document.createElement('div');
            section.className = 'category-block';
            section.id = `cat-${cat.id}`;
            section.innerHTML = `
                <h2 class="category-title">${cat.name}</h2>
                <div class="grid">
                    ${items.map(item => this.createItemCard(item)).join('')}
                </div>
            `;
            this.menuContainer.appendChild(section);
        });

        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                this.openItemModal(id);
            });
        });
    },

    createItemCard(item) {
        const tagsHtml = item.tags.map(t => `<span class="tag ${t.toLowerCase() === 'promoção' ? 'promo' : ''}">${t}</span>`).join('');
        return `
            <article class="card" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy">
                <div class="card-content">
                    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
                    <h3 class="card-title">${item.name}</h3>
                    <p class="card-desc">${item.description}</p>
                    <div class="card-footer">
                        <span class="price">${this.formatCurrency(item.price)}</span>
                        <button class="btn-add">+</button>
                    </div>
                </div>
            </article>
        `;
    },

    openItemModal(itemId) {
        const item = this.state.menuData.find(i => i.id === itemId);
        if (!item) return;

        this.state.currentItem = item;
        this.state.currentQty = 1;

        document.getElementById('modal-img').src = item.image;
        document.getElementById('modal-title').innerText = item.name;
        document.getElementById('modal-desc').innerText = item.description;
        document.getElementById('modal-price').innerText = this.formatCurrency(item.price);
        document.getElementById('modal-notes').value = '';
        
        this.updateModalPriceUI();
        this.itemModal.showModal();
    },

    closeItemModal() {
        this.itemModal.close();
        this.state.currentItem = null;
    },

    updateModalQty(change) {
        const newQty = this.state.currentQty + change;
        if (newQty >= 1 && newQty <= 99) {
            this.state.currentQty = newQty;
            this.updateModalPriceUI();
        }
    },

    updateModalPriceUI() {
        document.getElementById('modal-qty').innerText = this.state.currentQty;
        document.getElementById('modal-total').innerText = this.formatCurrency(this.state.currentItem.price * this.state.currentQty);
    },

    addToCart() {
        const item = this.state.currentItem;
        const qty = this.state.currentQty;
        const notes = document.getElementById('modal-notes').value.trim();
        
        const cartId = `${item.id}-${btoa(notes).substring(0, 10)}`; 
        const existing = this.state.cart.find(c => c.cartId === cartId);

        if (existing) {
            existing.qty += qty;
        } else {
            this.state.cart.push({ ...item, qty, notes, cartId });
        }

        this.closeItemModal();
        this.updateCartUI();
        this.showToast('Adicionado ao carrinho!');
    },

    updateCartUI() {
        this.cartCount.innerText = this.state.cart.reduce((sum, item) => sum + item.qty, 0);
        
        if (this.state.cart.length === 0) {
            this.cartItemsContainer.innerHTML = '<div class="empty-cart">Seu carrinho está vazio.</div>';
            this.btnCheckout.disabled = true;
            this.cartSubtotal.innerText = 'R$ 0,00';
            this.cartFee.innerText = 'R$ 0,00';
            this.cartTotal.innerText = 'R$ 0,00';
            return;
        }

        this.btnCheckout.disabled = false;
        this.cartItemsContainer.innerHTML = this.state.cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    ${item.notes ? `<div class="cart-item-notes">Obs: ${this.sanitize(item.notes)}</div>` : ''}
                    <div class="cart-item-price">${this.formatCurrency(item.price)}</div>
                    <div class="cart-item-actions">
                        <div class="qty-control">
                            <button onclick="App.changeCartQty('${item.cartId}', -1)">-</button>
                            <span>${item.qty}</span>
                            <button onclick="App.changeCartQty('${item.cartId}', 1)">+</button>
                        </div>
                        <button class="btn-remove" onclick="App.removeFromCart('${item.cartId}')">Remover</button>
                    </div>
                </div>
            </div>
        `).join('');

        const subtotal = this.state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const fee = this.state.restaurantInfo.deliveryFee;
        const total = subtotal + fee;

        this.cartSubtotal.innerText = this.formatCurrency(subtotal);
        this.cartFee.innerText = this.formatCurrency(fee);
        this.cartTotal.innerText = this.formatCurrency(total);
    },

    changeCartQty(cartId, delta) {
        const item = this.state.cart.find(c => c.cartId === cartId);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) this.removeFromCart(cartId);
            else this.updateCartUI();
        }
    },

    removeFromCart(cartId) {
        this.state.cart = this.state.cart.filter(c => c.cartId !== cartId);
        this.updateCartUI();
    },

    openCart() {
        this.cartDrawer.classList.add('open');
        this.cartOverlay.classList.add('active');
    },

    closeCart() {
        this.cartDrawer.classList.remove('open');
        this.cartOverlay.classList.remove('active');
    },

    openCheckoutModal() {
        this.closeCart();
        this.checkoutModal.showModal();
    },

    finalizeOrder(e) {
        e.preventDefault();
        
        const customer = {
            name: document.getElementById('c-name').value.trim(),
            phone: document.getElementById('c-phone').value.trim(),
            address: document.getElementById('c-address').value.trim(),
            number: document.getElementById('c-number').value.trim(),
            comp: document.getElementById('c-comp').value.trim(),
            neighborhood: document.getElementById('c-neighborhood').value.trim(),
            payment: document.getElementById('c-payment').value,
            change: document.getElementById('c-change').value.trim()
        };

        const subtotal = this.state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const fee = this.state.restaurantInfo.deliveryFee;
        const total = subtotal + fee;

        let itemsText = this.state.cart.map(item => 
            `▫️ ${item.qty}x ${item.name} - ${this.formatCurrency(item.price * item.qty)}` +
            (item.notes ? `\n   *Obs:* ${item.notes}` : '')
        ).join('\n');

        let msg = `🍔 *NOVO PEDIDO - PONTO 45 FOOD* 🍟\n\n`;
        msg += `*Cliente:* ${customer.name}\n`;
        msg += `*Telefone:* ${customer.phone}\n`;
        msg += `*Endereço:* ${customer.address}, ${customer.number}\n`;
        if(customer.comp) msg += `*Complemento:* ${customer.comp}\n`;
        msg += `*Bairro:* ${customer.neighborhood}\n\n`;
        
        msg += `*ITENS DO PEDIDO:*\n${itemsText}\n\n`;
        
        msg += `*Subtotal:* ${this.formatCurrency(subtotal)}\n`;
        msg += `*Taxa de Entrega:* ${this.formatCurrency(fee)}\n`;
        msg += `*TOTAL:* ${this.formatCurrency(total)}\n\n`;
        
        msg += `*Pagamento:* ${customer.payment}\n`;
        if (customer.payment === 'Dinheiro' && customer.change) {
            msg += `*Troco para:* R$ ${parseFloat(customer.change).toFixed(2)}\n`;
        }

        const encodedMsg = encodeURIComponent(msg);
        const waLink = `https://wa.me/${this.state.restaurantInfo.phone}?text=${encodedMsg}`;
        
        window.open(waLink, '_blank');
        this.checkoutModal.close();
    },

    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    },

    sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        this.toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    },

    checkScroll() {
        if (window.scrollY > 300) {
            this.fabTop.classList.add('visible');
        } else {
            this.fabTop.classList.remove('visible');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;