// Soumission des données - VERSION CORRIGÉE
async function submitResponses() {
    loadingOverlay.classList.remove('hidden');

    try {
        const payload = {};

        // Construction du payload avec toutes les données
        for (const [questionId, response] of Object.entries(responses)) {
            const question = questionsData.find(q => q.id === parseInt(questionId));
            
            let content;
            if (response.type === 'audio') {
                content = await audioToBase64(response.data);
            } else {
                content = response.data;
            }

            // Structure attendue par Apps Script
            payload[`question_${questionId}`] = content;
            payload[`question_${questionId}_type`] = response.type;
            payload[`question_${questionId}_text`] = question.question;
        }

        console.log('Payload envoyé:', payload); // Debug

        // Envoi vers Apps Script
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log('Statut réponse:', response.status); // Debug

        // Traitement de la réponse
        const result = await response.json();
        console.log('Réponse serveur:', result); // Debug

        if (result.success) {
            showCompletionScreen();
            displayCompletionInfo();
        } else {
            console.error('Erreur serveur:', result.error);
            alert('Erreur lors de l\'envoi: ' + (result.error || 'Erreur inconnue'));
        }

    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        alert('Erreur lors de l\'envoi des données. Veuillez réessayer.\nDétails: ' + error.message);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Fonction helper pour convertir audio en base64
function audioToBase64(audioBlob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            try {
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Erreur lecture fichier audio'));
        reader.readAsDataURL(audioBlob);
    });
}
