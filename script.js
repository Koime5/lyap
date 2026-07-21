(() => {
    'use strict';

    // State
    let count = 0;

    // Cached elements
    let htmlEl;
    let sunIcon;
    let moonIcon;

    /**
     * Initializes theme values and DOM references
     */
    function initTheme() {
        htmlEl = document.documentElement;
        sunIcon = document.getElementById('sunIcon');
        moonIcon = document.getElementById('moonIcon');

        const savedTheme = localStorage.getItem('theme') || 
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        applyTheme(savedTheme);
    }

    /**
     * Applies theme to the document and toggles switch icons
     * @param {string} theme - 'light' or 'dark'
     */
    function applyTheme(theme) {
        if (!htmlEl) return;
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (sunIcon && moonIcon) {
            const isLight = theme === 'light';
            sunIcon.style.display = isLight ? 'none' : 'block';
            moonIcon.style.display = isLight ? 'block' : 'none';
        }
    }

    /**
     * Toggles between light and dark theme
     */
    function toggleTheme() {
        if (!htmlEl) return;
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    /**
     * Copies code snippet to clipboard
     */
    function copyCode() {
        const rawCode = `<div ly-data="{ count: 0 }">
  <button @click="count++">+1</button>
  <span :text="count">0</span>
</div>`;
        navigator.clipboard.writeText(rawCode).then(() => {
            const btn = document.getElementById('copyBtn');
            if (btn) {
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = 'Copy';
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // Initialize event listeners when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Simple Counter Implementation
        const incBtn = document.getElementById('incBtn');
        const counterSpan = document.getElementById('counterSpan');
        if (incBtn && counterSpan) {
            incBtn.addEventListener('click', () => {
                count++;
                counterSpan.textContent = count;
            });
        }

        // Initialize Theme System
        initTheme();
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', toggleTheme);
        }

        // Copy Code Snippet
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', copyCode);
        }
    });
})();
