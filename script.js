const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const phraseStatusDiv = document.getElementById('phraseStatus');
const locationStatusDiv = document.getElementById('locationStatus');
const responseDiv = document.getElementById('response');

const SECRET_PHRASE = "I need water"; 
const BACKEND_URL = 'http://192.168.137.250:5000/sos';

let recognition;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// --- Speech Recognition ---
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        statusDiv.textContent = 'Status: Listening...';
        statusDiv.classList.add('listening');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript.toLowerCase().includes(SECRET_PHRASE.toLowerCase())) {
            phraseStatusDiv.textContent = `Last Detected Phrase: "${SECRET_PHRASE}" - Triggering SOS!`;
            statusDiv.textContent = 'Status: SOS Triggered!';
            statusDiv.classList.remove('listening');
            statusDiv.classList.add('alert');
            triggerSOS(); 
        } else {
            phraseStatusDiv.textContent = `Last Detected Phrase: "${finalTranscript || 'None'}"`;
        }
    };

    recognition.onend = () => {
        if (startButton.disabled && !stopButton.disabled) {
            recognition.start(); 
        } else {
            statusDiv.textContent = 'Status: Not listening.';
            statusDiv.classList.remove('listening');
        }
    };
} else {
    statusDiv.textContent = 'Status: Web Speech API not supported.';
    startButton.disabled = true;
}

// --- Audio Recording ---
async function startAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.start();
        isRecording = true;
    } catch (err) {
        alert('Microphone access denied.');
    }
}

function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
    }
}

// --- Geolocation ---
function getLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    locationStatusDiv.textContent = `Location: Lat ${lat}, Lon ${lon}`;
                    const link = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                    resolve({ latitude: lat, longitude: lon, googleMapsLink: link });
                },
                (error) => {
                    locationStatusDiv.textContent = `Location Error: ${error.message}`;
                    resolve(null);
                },
                {
                    enableHighAccuracy: true, 
                    timeout: 10000,           
                    maximumAge: 0             
                }
            );
        } else {
            locationStatusDiv.textContent = 'Geolocation not supported.';
            resolve(null);
        }
    });
}

// --- SOS Trigger ---
async function triggerSOS() {
    stopSpeechRecognition();
    stopAudioRecording();

    const locationData = await getLocation();
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('latitude', locationData ? locationData.latitude : 'N/A');
    formData.append('longitude', locationData ? locationData.longitude : 'N/A');
    formData.append('googleMapsLink', locationData ? locationData.googleMapsLink : 'N/A');
    formData.append('audio', audioBlob, 'evidence.wav');

    responseDiv.textContent = 'Server Response: Sending SOS...';

    try {
        const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });
        const result = await response.json();
        responseDiv.textContent = `Server Response: ${result.message}`;
    } catch (error) {
        responseDiv.textContent = `Server Response: Error - ${error.message}`;
    }
}

// --- Controls ---
startButton.addEventListener('click', () => {
    startButton.disabled = true;
    stopButton.disabled = false;
    recognition.start();
    startAudioRecording();
    getLocation();
});

stopButton.addEventListener('click', () => {
    stopSpeechRecognition();
    stopAudioRecording();
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = 'Status: Not listening.';
    statusDiv.classList.remove('listening', 'alert');
    phraseStatusDiv.textContent = 'Last Detected Phrase: None';
    locationStatusDiv.textContent = 'Location: Not available.';
    responseDiv.textContent = 'Server Response:';
});

function stopSpeechRecognition() {
    if (recognition && startButton.disabled) {
        recognition.stop();
    }
}
