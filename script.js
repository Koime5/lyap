// Simple Counter Implementation
let count = 0;
const incBtn = document.getElementById('incBtn');
const counterSpan = document.getElementById('counterSpan');

if (incBtn && counterSpan) {
    incBtn.addEventListener('click', () => {
        count++;
        counterSpan.textContent = count;
    });
}

// Copy code feature
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
    });
}

// Theme Switcher Logic
const htmlEl = document.documentElement;
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
    } else {
        applyTheme('dark');
    }
}

function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Check if icons exist before styling to prevent JS errors
    if (sunIcon && moonIcon) {
        if (theme === 'light') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}

function toggleTheme() {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
