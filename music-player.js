(function () {
    var audio = document.getElementById('background-music');
    var playButton = document.getElementById('music-play');
    var progress = document.getElementById('music-progress');
    var currentTimeLabel = document.getElementById('music-current-time');
    var durationLabel = document.getElementById('music-duration');
    var volume = document.getElementById('music-volume');
    var status = document.getElementById('music-status');
    var storageKey = 'magnum-music-player';
    var savedState = null;
    var restorePosition = 0;
    var shouldResume = true;

    if (!audio || !playButton || !progress || !currentTimeLabel || !durationLabel || !volume || !status) {
        return;
    }

    try {
        savedState = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch (error) {
        console.error('Не удалось прочитать состояние музыкального плеера:', error);
    }

    if (savedState && typeof savedState === 'object') {
        restorePosition = Number.isFinite(savedState.currentTime) ? Math.max(0, savedState.currentTime) : 0;
        shouldResume = savedState.isPlaying === true;
        if (Number.isFinite(savedState.volume)) {
            audio.volume = Math.min(1, Math.max(0, savedState.volume));
        }
    }

    volume.value = String(audio.volume);

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return '0:00';
        }

        var minutes = Math.floor(seconds / 60);
        var remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
        return minutes + ':' + remainder;
    }

    function updatePlayButton() {
        var isPlaying = !audio.paused;
        playButton.textContent = isPlaying ? '❚❚' : '▶';
        playButton.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
        playButton.setAttribute('aria-pressed', String(isPlaying));
    }

    function updateProgress() {
        var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        progress.max = String(duration);
        progress.value = String(Math.min(audio.currentTime, duration));
        currentTimeLabel.textContent = formatTime(audio.currentTime);
        durationLabel.textContent = formatTime(duration);
    }

    function saveState() {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                currentTime: audio.currentTime,
                isPlaying: !audio.paused,
                volume: audio.volume
            }));
        } catch (error) {
            console.error('Не удалось сохранить состояние музыкального плеера:', error);
        }
    }

    function playAudio() {
        status.textContent = '';
        var playAttempt = audio.play();
        if (playAttempt) {
            playAttempt.catch(function (error) {
                if (error.name === 'NotAllowedError') {
                    status.textContent = 'Нажмите ▶, чтобы продолжить музыку';
                    updatePlayButton();
                    saveState();
                    return;
                }
                console.error('Не удалось запустить музыку:', error);
                status.textContent = 'Не удалось воспроизвести музыку';
            });
        }
    }

    playButton.addEventListener('click', function () {
        if (audio.paused) {
            playAudio();
        } else {
            audio.pause();
        }
    });

    progress.addEventListener('input', function () {
        audio.currentTime = Number(progress.value);
        updateProgress();
        saveState();
    });

    volume.addEventListener('input', function () {
        audio.volume = Number(volume.value);
        saveState();
    });

    audio.addEventListener('timeupdate', updateProgress);
    function restorePlayback() {
        if (restorePosition > 0 && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(restorePosition, Math.max(0, audio.duration - 0.1));
        }
        updateProgress();

        if (shouldResume) {
            playAudio();
        }
    }

    audio.addEventListener('loadedmetadata', restorePlayback);
    audio.addEventListener('play', function () {
        status.textContent = '';
        updatePlayButton();
        saveState();
    });
    audio.addEventListener('pause', function () {
        updatePlayButton();
        saveState();
    });
    audio.addEventListener('ended', function () {
        updateProgress();
        saveState();
    });
    window.addEventListener('pagehide', saveState);

    updatePlayButton();
    updateProgress();
    if (audio.readyState >= 1) {
        restorePlayback();
    }
})();
