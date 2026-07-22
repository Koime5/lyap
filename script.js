(() => {
    'use strict';

    // State
    let count = 0;

    // Cached elements
    let htmlEl;
    let sunIcon;
    let moonIcon;

    // Cached layout measurements to prevent 60fps layout thrashing
    let cachedStartX = 0;
    let cachedStartY = 0;
    let cachedWidth = 0;
    let cachedHeight = 0;
    let cachedHeroHeight = 0;

    // Lightning canvas & animation state
    let canvas = null;
    let ctx = null;
    let animationStartTime = null;
    let strike1Triggered = false;
    let strike2Triggered = false;

    const activeStrikes = [];
    const activeChargeArcs = [];
    const sparks = [];
    let currentTension = 0;

    let currentColors = {
        gold: '#b6934a',
        goldSoft: '#8a7550',
        flashColor: '#ffe875',
        coreColor: '#ffffff'
    };

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
        
        updateColors();
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

    class Spark {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = Math.random() * 2 + 1; // drift down
            this.alpha = 1.0;
            this.decay = Math.random() * 0.03 + 0.02; // lifespan
            this.size = Math.random() * 1.5 + 1;
            this.color = color;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Recursively generates a jagged lightning path using midpoint displacement
     */
    function getLightningPath(startX, startY, endX, endY, displace, minLength = 8) {
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minLength) {
            return [{ x: startX, y: startY }, { x: endX, y: endY }];
        }
        
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        const perpX = -dy / dist;
        const perpY = dx / dist;
        
        const offset = (Math.random() - 0.5) * displace;
        const displacedMidX = midX + perpX * offset;
        const displacedMidY = midY + perpY * offset;
        
        const path1 = getLightningPath(startX, startY, displacedMidX, displacedMidY, displace * 0.5, minLength);
        const path2 = getLightningPath(displacedMidX, displacedMidY, endX, endY, displace * 0.5, minLength);
        
        return path1.concat(path2.slice(1));
    }

    /**
     * Helper to convert HEX color string to RGBA
     */
    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Recursively generates a structured, downward-trending fractal lightning tree (acute angles)
     */
    function generateForkedLightning(startX, startY, endX, endY, displace, level = 0, maxLevel = 2) {
        const path = getLightningPath(startX, startY, endX, endY, displace, 8);
        let results = [{ path, level }];
        
        if (level >= maxLevel) return results;
        
        const segmentCount = path.length;
        for (let i = 4; i < segmentCount - 4; i++) {
            const forkProb = level === 0 ? 0.08 : 0.04;
            if (Math.random() < forkProb) {
                const pt = path[i];
                
                const dx = path[i+1].x - path[i].x;
                const dy = path[i+1].y - path[i].y;
                const parentAngle = Math.atan2(dx, dy);
                
                const sign = Math.random() < 0.5 ? -1 : 1;
                const forkAngle = parentAngle + sign * (0.35 + Math.random() * 0.35); 
                
                const parentRemainingDist = segmentCount - i;
                const forkLength = parentRemainingDist * 7.5 * (0.45 + Math.random() * 0.45);
                
                const forkEndX = pt.x + Math.sin(forkAngle) * forkLength;
                const forkEndY = pt.y + Math.cos(forkAngle) * forkLength;
                
                const subBranches = generateForkedLightning(
                    pt.x, pt.y, 
                    forkEndX, forkEndY, 
                    displace * 0.5, 
                    level + 1, 
                    maxLevel
                );
                results = results.concat(subBranches);
                
                i += 4; // skip segments to prevent cluttering
            }
        }
        
        return results;
    }

    /**
     * Draws a glowing lightning path on the canvas context (more white, reduced yellow)
     */
    function drawLightningPath(ctx, path, baseWidth, color, coreColor) {
        if (path.length < 2) return;
        
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = baseWidth * 5;
        ctx.lineWidth = baseWidth * 2.2;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = baseWidth * 1.4;
        ctx.stroke();
    }

    /**
     * Triggers a lightning strike and updates particle lists (optimized with cached coordinates)
     */
    function triggerStrike(isManual = false) {
        if (!canvas) return;
        
        const startX = cachedStartX;
        const startY = cachedStartY;
        const endX = cachedWidth / 2 + (Math.random() - 0.5) * 260;
        const endY = cachedHeight;
        
        const branches = generateForkedLightning(startX, startY, endX, endY, 130, 0, 2);
        
        activeStrikes.push({
            startX,
            startY,
            branches,
            startTime: performance.now(),
            duration: isManual ? 320 : 240, // double return stroke timeline (240ms/320ms)
            color: currentColors.flashColor,
            coreColor: currentColors.coreColor,
            ambientColor: currentColors.ambientColor
        });
        
        // Generate sparks along the main trunk only (level 0)
        branches.forEach(branch => {
            if (branch.level === 0) {
                branch.path.forEach((pt, idx) => {
                    if (idx % 3 === 0 && Math.random() < 0.7) {
                        sparks.push(new Spark(pt.x, pt.y, currentColors.gold));
                    }
                });
            }
        });
    }

    /**
     * Updates and draws plasma arcs during the charge up phase (optimized context overhead)
     */
    function updateAndDrawChargeArcs(ctx, now, color) {
        if (activeChargeArcs.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 2;
        
        for (let i = activeChargeArcs.length - 1; i >= 0; i--) {
            const arc = activeChargeArcs[i];
            const elapsed = now - arc.startTime;
            if (elapsed > arc.life) {
                activeChargeArcs.splice(i, 1);
                continue;
            }
            
            ctx.globalAlpha = arc.alpha * (1 - elapsed / arc.life);
            ctx.beginPath();
            ctx.moveTo(arc.path[0].x, arc.path[0].y);
            for (let j = 1; j < arc.path.length; j++) {
                ctx.lineTo(arc.path[j].x, arc.path[j].y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Caches current theme colors to avoid layout thrashing in 60fps loop
     */
    function updateColors() {
        const style = getComputedStyle(document.documentElement);
        const gold = style.getPropertyValue('--gold').trim() || '#b6934a';
        const goldSoft = style.getPropertyValue('--gold-soft').trim() || '#8a7550';
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Use pale warm white/ivory instead of saturated yellow to reduce yellow tone
        const flashColor = isDark ? '#fffdf0' : '#fffdf5';
        const coreColor = '#ffffff'; // pure white core for maximum brightness
        const ambientColor = flashColor; // match flash color to revert to light-colored ambient glow
        
        currentColors = { gold, goldSoft, flashColor, coreColor, ambientColor };
    }

    /**
     * Initializes background canvas for current flow / lightning strikes
     */
    function initCanvas() {
        const body = document.body;
        canvas = document.createElement('canvas');
        canvas.className = 'hero-bg-canvas';
        canvas.id = 'heroCanvas';
        body.insertBefore(canvas, body.firstChild);
        
        ctx = canvas.getContext('2d');
        
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('load', resizeCanvas);
        resizeCanvas();
    }

    function resizeCanvas() {
        if (!canvas) return;
        const hero = document.querySelector('header.hero');
        const emblem = document.querySelector('.emblem');
        if (!hero || !emblem) return;
        
        const heroRect = hero.getBoundingClientRect();
        const emblemRect = emblem.getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        
        // 1. Calculate and update height of canvas globally
        const height = heroRect.bottom - bodyRect.top;
        canvas.style.height = height + 'px';
        
        // 2. Cache measurements to avoid layout thrashing in animation loop
        const rect = canvas.getBoundingClientRect();
        cachedWidth = rect.width;
        cachedHeight = rect.height;
        cachedHeroHeight = heroRect.height;
        
        // 3. Cache start coordinates relative to body top-left
        cachedStartX = emblemRect.left - bodyRect.left + emblemRect.width * 0.40;
        cachedStartY = emblemRect.top - bodyRect.top + emblemRect.height * 0.94;
        
        // 4. Configure high-DPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width = cachedWidth * dpr;
        canvas.height = cachedHeight * dpr;
        ctx.scale(dpr, dpr);
    }

    function syncAnimationEvents() {
        const bolt = document.querySelector('.emblem-bolt');
        if (bolt) {
            bolt.addEventListener('animationstart', () => {
                animationStartTime = performance.now();
                strike1Triggered = false;
                strike2Triggered = false;
            });
            bolt.addEventListener('animationiteration', () => {
                animationStartTime = performance.now();
                strike1Triggered = false;
                strike2Triggered = false;
            });
        }
    }

    /**
     * Main animation loop running at 60fps (optimized to prevent layout thrashing)
     */
    function tick() {
        requestAnimationFrame(tick);
        
        if (!canvas || !ctx) return;
        
        const now = performance.now();
        ctx.clearRect(0, 0, cachedWidth, cachedHeight);
        
        const startX = cachedStartX;
        const startY = cachedStartY;
        
        if (animationStartTime === null) {
            animationStartTime = now;
        }
        const elapsed = (now - animationStartTime) % 6000;

        // Dim background dynamically (in sync with logo saturation keyframe cycles)
        let targetTension = 0;
        if (elapsed < 960) {
            // 0% to 16% of loop: logo raises and saturates, background dims in sync
            targetTension = elapsed / 960;
        } else if (elapsed < 1680) {
            // 16% to 28% of loop: active strike phase (dimmed for high visibility)
            targetTension = 1.0;
        } else if (elapsed < 1980) {
            // 28% to 33%: clears immediately after the second strike ends
            targetTension = 1.0 - (elapsed - 1680) / (1980 - 1680);
        } else {
            targetTension = 0.0;
        }

        // Account for manual strikes: hold tension during the active strikes, then drop
        activeStrikes.forEach(s => {
            const age = now - s.startTime;
            if (age < s.duration) {
                targetTension = 1.0;
            }
        });

        // Speed up the interpolation slightly for a crisper release after the strike
        currentTension += (targetTension - currentTension) * 0.18;

        if (currentTension > 0.01) {
            ctx.save();
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = currentTension * 0.16; // dim background up to a subtle 16% opacity
            ctx.fillRect(0, 0, cachedWidth, cachedHeight);
            ctx.restore();
        }
        
        if (elapsed < 100) {
            strike1Triggered = false;
            strike2Triggered = false;
        }
        
        if (elapsed >= 1320 && !strike1Triggered) {
            triggerStrike(false);
            strike1Triggered = true;
        }
        if (elapsed >= 1560 && !strike2Triggered) {
            triggerStrike(false);
            strike2Triggered = true;
        }
        
        if (elapsed >= 960 && elapsed < 1320) {
            const chargeProgress = (elapsed - 960) / (1320 - 960);
            if (Math.random() < 0.25) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 25 + Math.random() * 35 * (1 - chargeProgress * 0.4);
                const arcStartX = startX + Math.cos(angle) * dist;
                const arcStartY = startY + Math.sin(angle) * dist;
                const arcPath = getLightningPath(arcStartX, arcStartY, startX, startY, 12, 4);
                activeChargeArcs.push({
                    path: arcPath,
                    startTime: now,
                    life: 50 + Math.random() * 30,
                    alpha: 0.3 + chargeProgress * 0.5
                });
            }
        }
        
        updateAndDrawChargeArcs(ctx, now, currentColors.gold);
        
        // 1. Draw Main Downward Currents with flickering return strokes and ambient light
        if (activeStrikes.length > 0) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            for (let i = activeStrikes.length - 1; i >= 0; i--) {
                const strike = activeStrikes[i];
                const age = now - strike.startTime;
                if (age > strike.duration) {
                    activeStrikes.splice(i, 1);
                    continue;
                }
                
                // Rapid double-stroke return flicker simulation
                const progress = age / strike.duration;
                let alpha = 0;
                if (progress < 0.15) {
                    alpha = Math.sin((progress / 0.15) * Math.PI); // Return stroke 1
                } else if (progress < 0.32) {
                    alpha = 0.08; // Inter-stroke pause
                } else if (progress < 0.52) {
                    alpha = Math.sin(((progress - 0.32) / 0.20) * Math.PI) * 0.75; // Return stroke 2
                } else if (progress < 0.65) {
                    alpha = 0.05; // Inter-stroke pause 2
                } else {
                    alpha = (1 - (progress - 0.65) / 0.35) * 0.35; // Final channel decay
                }
                
                // Draw ambient cloud glow behind the strike
                const ambientColor = strike.ambientColor || strike.color;
                const gradient = ctx.createRadialGradient(startX, startY, 5, startX, startY, cachedHeight * 0.85);
                gradient.addColorStop(0, hexToRgba(ambientColor, alpha * 0.25));
                gradient.addColorStop(0.3, hexToRgba(ambientColor, alpha * 0.08));
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, cachedWidth, cachedHeight);
                
                // Draw actual fractal branch components
                ctx.globalAlpha = alpha;
                strike.branches.forEach(branch => {
                    let baseWidth = 1.3; // main trunk
                    if (branch.level === 1) baseWidth = 0.65; // primary branches
                    if (branch.level === 2) baseWidth = 0.28; // secondary branches
                    drawLightningPath(ctx, branch.path, baseWidth, strike.color, strike.coreColor);
                });
            }
            
            ctx.restore();
        }
        
        // 2. Draw Sparks (fully inlined & optimized to remove per-spark context overhead)
        if (sparks.length > 0) {
            ctx.save();
            ctx.shadowBlur = 0; // disable shadow for fast rendering
            
            for (let i = sparks.length - 1; i >= 0; i--) {
                const spark = sparks[i];
                spark.update();
                if (spark.alpha <= 0) {
                    sparks.splice(i, 1);
                    continue;
                }
                
                ctx.globalAlpha = spark.alpha;
                ctx.fillStyle = spark.color;
                ctx.beginPath();
                ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
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

        // Setup lightning canvas
        initCanvas();
        syncAnimationEvents();
        requestAnimationFrame(tick);

        // Interactive emblem click strike
        const emblem = document.querySelector('.emblem');
        if (emblem) {
            const bolt = emblem.querySelector('.emblem-bolt');
            if (bolt) {
                emblem.addEventListener('click', () => {
                    triggerStrike(true);
                    setTimeout(() => triggerStrike(true), 150);
                    
                    bolt.classList.remove('manual-flash');
                    void bolt.offsetWidth; // force reflow
                    bolt.classList.add('manual-flash');
                });
                
                bolt.addEventListener('animationend', (e) => {
                    if (e.animationName.startsWith('manualFlashBolt')) {
                        bolt.classList.remove('manual-flash');
                    }
                });
            }
        }
    });
})();
