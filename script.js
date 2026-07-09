document.getElementById('obfuscateBtn').addEventListener('click', async () => {
    const codeInput = document.getElementById('codeInput').value;
    const outputArea = document.getElementById('codeOutput');
    const btn = document.getElementById('obfuscateBtn');
    const btnText = document.getElementById('btnText');

    if (!codeInput.trim()) {
        outputArea.value = "-- Please enter some code first.";
        return;
    }

    // Buton animasyonu ve bekleme durumu
    btn.disabled = true;
    btnText.innerText = "PROCESSING...";

    try {
        const response = await fetch("https://sukared-backend.onrender.com/obfuscate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code: codeInput })
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
        // Butonu eski haline getir
        btn.disabled = false;
        btnText.innerText = "OBFUSCATE";
    }
});