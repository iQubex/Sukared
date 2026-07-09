document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('obfuscateBtn');
    const codeInput = document.getElementById('codeInput');
    const outputArea = document.getElementById('codeOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const mainTitle = document.getElementById('mainTitle');
    const subTitle = document.getElementById('subTitle');

    // 1. Asynchronous Decrypt (Hacker Scramble & Lock) & Idle Micro-Glitch Class
    class HackerTextEffect {
        constructor(element, finalText, resolveSpeed = 350, scrambleSpeed = 30) {
            this.element = element;
            this.finalText = finalText;
            this.resolveSpeed = resolveSpeed; 
            this.scrambleSpeed = scrambleSpeed; 
            this.chars = '$#%&?@[]{}<>+=!*^~';
            this.resolvedIndex = 0;
            this.interval = null;
            this.glitchTimeout = null;
            this.isResolved = false;
        }

        start() {
            this.resolvedIndex = 0;
            this.isResolved = false;
            
            // Rapid scramble loop (30ms)
            this.interval = setInterval(() => {
                this.update();
            }, this.scrambleSpeed);

            // Slow lock loop (350ms)
            const lockNextChar = () => {
                if (this.resolvedIndex < this.finalText.length) {
                    this.resolvedIndex++;
                    setTimeout(lockNextChar, this.resolveSpeed);
                } else {
                    clearInterval(this.interval);
                    this.element.innerText = this.finalText;
                    this.isResolved = true;
                    this.startIdleGlitch();
                }
            };
            setTimeout(lockNextChar, this.resolveSpeed);
        }

        update() {
            let display = '';
            for (let i = 0; i < this.finalText.length; i++) {
                if (i < this.resolvedIndex) {
                    display += this.finalText[i];
                } else {
                    if (this.finalText[i] === ' ') {
                        display += ' ';
                    } else {
                        display += this.chars[Math.floor(Math.random() * this.chars.length)];
                    }
                }
            }
            this.element.innerText = display;
        }

        startIdleGlitch() {
            const triggerGlitch = () => {
                if (!this.isResolved) return;

                const textArray = this.finalText.split('');
                const numGlitched = Math.random() > 0.5 ? 2 : 1;
                
                for (let k = 0; k < numGlitched; k++) {
                    const idx = Math.floor(Math.random() * this.finalText.length);
                    if (this.finalText[idx] !== ' ') {
                        textArray[idx] = this.chars[Math.floor(Math.random() * this.chars.length)];
                    }
                }

                this.element.innerText = textArray.join('');

                // Restore original letter after 60-100ms
                setTimeout(() => {
                    if (this.isResolved) {
                        this.element.innerText = this.finalText;
                    }
                }, 60 + Math.random() * 40);

                // Schedule next glitch in 1.5s to 3s
                const nextGlitchTime = 1500 + Math.random() * 1500;
                this.glitchTimeout = setTimeout(triggerGlitch, nextGlitchTime);
            };

            const firstGlitchTime = 1500 + Math.random() * 1500;
            this.glitchTimeout = setTimeout(triggerGlitch, firstGlitchTime);
        }

        stop() {
            clearInterval(this.interval);
            clearTimeout(this.glitchTimeout);
        }
    }

    // Initialize scramble text effects on load
    const mainTitleEffect = new HackerTextEffect(mainTitle, 'SukaRed');
    const subTitleEffect = new HackerTextEffect(subTitle, 'Obfuscator');
    
    mainTitleEffect.start();
    subTitleEffect.start();

    // 2. Play Button Click Event & Ripple Animation
    playBtn.addEventListener('click', async () => {
        const code = codeInput.value;
        if (!code.trim()) {
            outputArea.value = "-- Please enter some code first.";
            return;
        }

        // Ripple wave effect creation
        const ripple = document.createElement('div');
        ripple.classList.add('ripple-wave');
        playBtn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 800);

        // Put button into processing state
        playBtn.disabled = true;
        playBtn.classList.add('processing');

        try {
            const response = await fetch("https://sukared-backend.onrender.com/obfuscate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ code: code })
            });

            const data = await response.json();

            if (response.ok) {
                outputArea.value = data.obfuscated;
            } else {
                outputArea.value = "-- An error occurred: " + (data.error || "Unknown error");
            }
        } catch (error) {
            outputArea.value = "-- Connection error. Is the backend server running?";
        } finally {
            playBtn.disabled = false;
            playBtn.classList.remove('processing');
        }
    });

    // 3. Copy Button Functionality
    copyBtn.addEventListener('click', () => {
        const codeOutput = outputArea.value;
        if (!codeOutput || codeOutput.startsWith('--')) return;

        navigator.clipboard.writeText(codeOutput).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            copyBtn.style.borderColor = '#00ff88';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.borderColor = '';
            }, 1500);
        });
    });

    // 4. Download Button Functionality
    downloadBtn.addEventListener('click', () => {
        const codeOutput = outputArea.value;
        if (!codeOutput || codeOutput.startsWith('--')) return;

        const blob = new Blob([codeOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'obfuscated.lua';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});