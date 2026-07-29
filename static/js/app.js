// Safe localStorage wrappers
function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Storage access denied:", e);
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Storage access denied:", e);
    }
}

function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn("Storage access denied:", e);
    }
}

// State
let chats = [];
let currentChatId = null;
let customApiKey = safeGetItem('gemini_api_key') || '';

// DOM Elements
const sidebar = document.getElementById('app-sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn-id');
const closeSidebarBtn = document.getElementById('close-sidebar-id');
const newChatBtn = document.getElementById('new-chat-btn-id');
const chatHistoryList = document.getElementById('chat-history-list-id');
const clearHistoryBtn = document.getElementById('clear-history-btn-id');
const openSettingsBtn = document.getElementById('open-settings-btn-id');

const messagesContainer = document.getElementById('messages-container-id');
const messagesFeed = document.getElementById('messages-feed-id');
const emptyState = document.getElementById('empty-state-id');
const typingIndicator = document.getElementById('typing-indicator-id');

const userInput = document.getElementById('user-input-id');
const sendBtn = document.getElementById('send-btn-id');

const settingsModal = document.getElementById('settings-modal-id');
const closeModalBtn = document.getElementById('close-modal-btn-id');
const apiKeyInput = document.getElementById('api-key-input-id');
const togglePasswordBtn = document.getElementById('toggle-password-btn-id');
const testKeyBtn = document.getElementById('test-key-btn-id');
const saveKeyBtn = document.getElementById('save-key-btn-id');
const keyTestResult = document.getElementById('key-test-result-id');
const keyStatusBadge = document.getElementById('key-status-badge-id');
const keyStatusText = document.getElementById('key-status-text');

// Initialize App
function initApp() {
    loadChats();
    checkApiKeyStatus();
    setupEventListeners();
    
    // Auto-grow input text area
    if (userInput) {
        userInput.addEventListener('input', autoGrowInput);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Set suggested prompt from cards
function setPrompt(text) {
    if (userInput) {
        userInput.value = text;
        autoGrowInput();
        userInput.focus();
    }
}

// Auto-grow input textarea logic
function autoGrowInput() {
    if (userInput) {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight - 16) + 'px'; // adjust for padding
    }
}

// Load chats from LocalStorage
function loadChats() {
    const savedChats = safeGetItem('gemini_chats');
    chats = [];
    if (savedChats) {
        try {
            const parsed = JSON.parse(savedChats);
            if (Array.isArray(parsed)) {
                chats = parsed;
            }
        } catch (e) {
            chats = [];
        }
    }
    
    if (chats && chats.length > 0) {
        const lastActiveId = safeGetItem('gemini_active_chat_id');
        const activeChatExists = chats.some(c => c.id == lastActiveId);
        currentChatId = activeChatExists ? Number(lastActiveId) : chats[0].id;
        renderActiveChat();
    } else {
        showEmptyState();
    }
    renderSidebarHistory();
}

// Save chats to LocalStorage
function saveChats() {
    safeSetItem('gemini_chats', JSON.stringify(chats));
    if (currentChatId) {
        safeSetItem('gemini_active_chat_id', currentChatId);
    } else {
        safeRemoveItem('gemini_active_chat_id');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar toggle events
    if (toggleSidebarBtn && sidebar) toggleSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    if (closeSidebarBtn && sidebar) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    
    // New Chat Click
    if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
    
    // Clear History Click
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Settings Modal toggle events
    if (openSettingsBtn && settingsModal) openSettingsBtn.addEventListener('click', () => openModal(settingsModal));
    if (closeModalBtn && settingsModal) closeModalBtn.addEventListener('click', () => closeModal(settingsModal));
    if (keyStatusBadge && settingsModal) keyStatusBadge.addEventListener('click', () => openModal(settingsModal));
    
    // Close modal when clicking outside
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeModal(settingsModal);
        });
    }
    
    // Password toggle
    if (togglePasswordBtn) togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // API key tests and save
    if (testKeyBtn) testKeyBtn.addEventListener('click', testApiKey);
    if (saveKeyBtn) saveKeyBtn.addEventListener('click', saveApiKey);
    
    // Chat submit events
    if (sendBtn) {
        sendBtn.addEventListener('click', handleChatSubmit);
    }
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
            }
        });
    }
}

// Start a new chat
function startNewChat() {
    currentChatId = null;
    showEmptyState();
    if (sidebar) sidebar.classList.remove('open');
    if (userInput) {
        userInput.value = '';
        autoGrowInput();
        userInput.focus();
    }
}

// Clear all history
function clearAllHistory() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không? Hành động này không thể hoàn tác.')) {
        chats = [];
        currentChatId = null;
        saveChats();
        showEmptyState();
        renderSidebarHistory();
    }
}

// Check if API Key is configured on either frontend or backend
async function checkApiKeyStatus() {
    if (customApiKey) {
        if (apiKeyInput) apiKeyInput.value = customApiKey;
        if (keyStatusBadge && keyStatusText) {
            keyStatusBadge.className = 'key-status-badge configured';
            keyStatusText.textContent = 'API Key cá nhân';
        }
        return;
    }
    
    try {
        const response = await fetch('/api/check_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: '' })
        });
        const data = await response.json();
        
        if (keyStatusBadge && keyStatusText) {
            if (data.valid) {
                keyStatusBadge.className = 'key-status-badge configured';
                keyStatusText.textContent = 'Đã cấu hình máy chủ';
            } else {
                keyStatusBadge.className = 'key-status-badge missing';
                keyStatusText.textContent = 'Chưa cấu hình API Key';
            }
        }
    } catch (e) {
        if (keyStatusBadge && keyStatusText) {
            keyStatusBadge.className = 'key-status-badge missing';
            keyStatusText.textContent = 'Lỗi kết nối máy chủ';
        }
    }
}

// Toggle password input visibility
function togglePasswordVisibility() {
    if (!apiKeyInput) return;
    const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKeyInput.setAttribute('type', type);
    const eyeIcon = togglePasswordBtn ? togglePasswordBtn.querySelector('i') : null;
    if (eyeIcon) {
        if (type === 'text') {
            eyeIcon.className = 'fa-solid fa-eye-slash';
        } else {
            eyeIcon.className = 'fa-solid fa-eye';
        }
    }
}

// Open Modal
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    if (apiKeyInput) apiKeyInput.value = safeGetItem('gemini_api_key') || '';
    if (keyTestResult) keyTestResult.style.display = 'none';
}

// Close Modal
function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
}

// Test API Key validity
async function testApiKey() {
    if (!apiKeyInput || !testKeyBtn) return;
    const keyToTest = apiKeyInput.value.trim();
    
    testKeyBtn.disabled = true;
    testKeyBtn.textContent = 'Đang kiểm tra...';
    if (keyTestResult) keyTestResult.style.display = 'none';
    
    try {
        const response = await fetch('/api/check_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: keyToTest })
        });
        const data = await response.json();
        
        if (keyTestResult) {
            keyTestResult.style.display = 'block';
            const testMsgEl = keyTestResult.querySelector('.test-message');
            if (data.valid) {
                keyTestResult.className = 'key-test-result success';
                if (testMsgEl) testMsgEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Kết nối thành công! API Key hợp lệ.';
            } else {
                keyTestResult.className = 'key-test-result error';
                if (testMsgEl) testMsgEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Lỗi: ${data.error || 'API Key không hợp lệ'}`;
            }
        }
    } catch (e) {
        if (keyTestResult) {
            keyTestResult.style.display = 'block';
            keyTestResult.className = 'key-test-result error';
            const testMsgEl = keyTestResult.querySelector('.test-message');
            if (testMsgEl) testMsgEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Không thể kết nối với máy chủ.';
        }
    } finally {
        testKeyBtn.disabled = false;
        testKeyBtn.textContent = 'Kiểm tra kết nối';
    }
}

// Save API Key
function saveApiKey() {
    if (!apiKeyInput) return;
    const key = apiKeyInput.value.trim();
    if (key) {
        safeSetItem('gemini_api_key', key);
        customApiKey = key;
    } else {
        safeRemoveItem('gemini_api_key');
        customApiKey = '';
    }
    
    checkApiKeyStatus();
    closeModal(settingsModal);
}

// Show empty state
function showEmptyState() {
    if (emptyState) emptyState.style.display = 'flex';
    if (messagesFeed) messagesFeed.style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
    if (emptyState) emptyState.style.display = 'none';
    if (messagesFeed) messagesFeed.style.display = 'flex';
}

// Render active chat messages
function renderActiveChat() {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    if (messagesFeed) {
        messagesFeed.innerHTML = '';
        const msgs = activeChat.messages || activeChat.history || [];
        msgs.forEach(msg => {
            if(msg) appendMessageToFeed(msg.role || 'user', msg.text || '');
        });
        try {
            postProcessMessages();
        } catch (e) {
            console.error(e);
        }
    }
    scrollToBottom();
}

// Safe Markdown Parsing
function safeMarkdownParse(text) {
    try {
        if (typeof marked !== 'undefined') {
            if (typeof marked.parse === 'function') {
                return marked.parse(text);
            } else if (typeof marked === 'function') {
                return marked(text);
            }
        }
    } catch (e) {
        console.error("Marked parsing error:", e);
    }
    return escapeHTML(text).replace(/\n/g, '<br>');
}

// Post-process rendered messages to format code blocks
function postProcessMessages() {
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('.message-bubble pre code').forEach((block) => {
            if (!block.classList.contains('hljs')) {
                hljs.highlightElement(block);
            }
        });
    }
    
    document.querySelectorAll('.message-bubble pre').forEach((pre) => {
        if (pre.parentElement.classList.contains('code-block-wrapper')) {
            return;
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        const codeElement = pre.querySelector('code');
        let lang = 'code';
        if (codeElement) {
            const classes = Array.from(codeElement.classList);
            const langClass = classes.find(c => c.startsWith('language-'));
            if (langClass) {
                lang = langClass.replace('language-', '');
            }
        }
        
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span>${lang}</span>
            <button class="copy-code-btn" onclick="copyCode(this)">
                <i class="fa-regular fa-copy"></i> Copy
            </button>
        `;
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });
}

// Helper to append a single message element to feed
function appendMessageToFeed(role, text) {
    if (!messagesFeed) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role}`;
    
    const avatarNode = document.createElement('div');
    if (role === 'user') {
        avatarNode.className = 'avatar';
        avatarNode.innerHTML = '<i class="fa-solid fa-user"></i>';
    } else {
        avatarNode.className = 'bot-avatar';
        avatarNode.innerHTML = '<i class="fa-solid fa-robot"></i>';
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (role === 'user') {
        bubble.textContent = text;
    } else {
        bubble.innerHTML = safeMarkdownParse(text);
    }
    
    if (role === 'user') {
        wrapper.appendChild(bubble);
        wrapper.appendChild(avatarNode);
    } else {
        wrapper.appendChild(avatarNode);
        wrapper.appendChild(bubble);
    }
    
    messagesFeed.appendChild(wrapper);
}

// Render Sidebar History Items
function renderSidebarHistory() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = '';
    
    const sortedChats = [...chats].sort((a, b) => b.id - a.id);
    
    sortedChats.forEach(chat => {
        const item = document.createElement('li');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.setAttribute('data-id', chat.id);
        
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'history-title-wrapper';
        titleWrapper.innerHTML = `<i class="fa-regular fa-comment"></i><span class="history-title">${escapeHTML(chat.title)}</span>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.setAttribute('aria-label', 'Xóa chat');
        deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        
        titleWrapper.addEventListener('click', () => {
            currentChatId = chat.id;
            renderActiveChat();
            renderSidebarHistory();
            if (sidebar) sidebar.classList.remove('open');
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        item.appendChild(titleWrapper);
        item.appendChild(deleteBtn);
        chatHistoryList.appendChild(item);
    });
}

// Delete Chat by ID
function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    saveChats();
    
    if (currentChatId === id) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
            renderActiveChat();
        } else {
            currentChatId = null;
            showEmptyState();
        }
    }
    
    renderSidebarHistory();
}

// Handle chatbot submission
async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    if (!userInput) return;
    
    const text = userInput.value.trim();
    if (!text) return;
    
    userInput.value = '';
    autoGrowInput();
    
    let activeChat;
    
    if (!currentChatId) {
        const newId = Date.now();
        activeChat = {
            id: newId,
            title: text.substring(0, 24) + (text.length > 24 ? '...' : ''),
            messages: []
        };
        chats.push(activeChat);
        currentChatId = newId;
        hideEmptyState();
    } else {
        activeChat = chats.find(c => c.id === currentChatId);
    }
    
    if (!activeChat.messages) activeChat.messages = [];
    activeChat.messages.push({ role: 'user', text: text });
    saveChats();
    
    appendMessageToFeed('user', text);
    renderSidebarHistory();
    scrollToBottom();
    
    if (typingIndicator) typingIndicator.style.display = 'flex';
    scrollToBottom();
    
    // Support older schema fallback
    const msgs = activeChat.messages || activeChat.history || [];
    const history = msgs.slice(0, -1);
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (customApiKey) {
            headers['X-Groq-API-Key'] = customApiKey;
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                message: text,
                history: history
            })
        });
        
        const data = await response.json();
        
        if (typingIndicator) typingIndicator.style.display = 'none';
        
        if (response.ok) {
            activeChat.messages.push({ role: 'model', text: data.response });
            saveChats();
            appendMessageToFeed('model', data.response);
            postProcessMessages();
        } else {
            let errorText = data.error || 'Lỗi không xác định khi trò chuyện với AI.';
            appendMessageToFeed('model', `⚠️ **Lỗi:** ${errorText}`);
            
            if (response.status === 400 && errorText.includes('API Key')) {
                appendMessageToFeed('model', `*Gợi ý: Nhấp vào nút **Cài đặt API Key** dưới góc trái màn hình hoặc [nhấp vào đây](javascript:document.getElementById('open-settings-btn-id').click()) để thiết lập API Key.*`);
            }
        }
    } catch (e) {
        if (typingIndicator) typingIndicator.style.display = 'none';
        appendMessageToFeed('model', `⚠️ **Lỗi kết nối:** Không thể kết nối với máy chủ Flask. Vui lòng kiểm tra lại xem Flask đã được chạy chưa.`);
    } finally {
        scrollToBottom();
    }
}

// Scroll messages container to the bottom
function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Helper: Escape HTML
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Copy Code Block to Clipboard
function copyCode(button) {
    const pre = button.parentElement.nextElementSibling;
    if (!pre) return;
    const code = pre.querySelector('code');
    if (!code) return;
    
    navigator.clipboard.writeText(code.innerText).then(() => {
        button.innerHTML = '<i class="fa-solid fa-circle-check"></i> Copied!';
        button.style.color = '#10b981';
        
        setTimeout(() => {
            button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            button.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}
