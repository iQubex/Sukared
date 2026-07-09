document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('obfuscateBtn');
    const codeInput = document.getElementById('codeInput');
    const outputArea = document.getElementById('codeOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const subTitle = document.getElementById('subTitle');

    // 1. Header Glitch / Scramble Animation
    function scrambleText(element, finalWord) {
        const chars = '010101!@#$%&*?';
        let iterations = 0;
        const interval = setInterval(() => {
            element.innerText = finalWord.split('')
                .map((char, index) => {
                    if (index < iterations) {
                        return finalWord[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
               .join('');
            
            if (iterations >= finalWord.length) {
                clearInterval(interval);
            }
            
            iterations += 1 / 3;
        }, 30);
    }

    scrambleText(subTitle, 'Obfuscator');

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