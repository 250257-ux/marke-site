(function () {
    var canvas = document.getElementById('rainfall');
    var context = canvas && canvas.getContext('2d');

    if (!canvas || !context) {
        return;
    }

    var width = 0;
    var height = 0;
    var drops = [];
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resizeCanvas() {
        var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        var dropCount = Math.min(260, Math.max(40, Math.floor(width * height / 7000)));
        drops = [];
        for (var i = 0; i < dropCount; i += 1) {
            drops.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: 10 + Math.random() * 14,
                speed: 4 + Math.random() * 4
            });
        }
    }

    function animateRain() {
        context.clearRect(0, 0, width, height);
        context.strokeStyle = 'rgba(110, 160, 190, 0.55)';
        context.lineWidth = 1.2;
        context.lineCap = 'round';

        for (var i = 0; i < drops.length; i += 1) {
            var drop = drops[i];
            context.beginPath();
            context.moveTo(drop.x, drop.y);
            context.lineTo(drop.x - drop.length * 0.25, drop.y + drop.length);
            context.stroke();

            if (!reducedMotion) {
                drop.x -= drop.speed * 0.25;
                drop.y += drop.speed;
                if (drop.y > height + drop.length) {
                    drop.x = Math.random() * width;
                    drop.y = -drop.length;
                }
            }
        }

        if (!reducedMotion) {
            window.requestAnimationFrame(animateRain);
        }
    }

    resizeCanvas();
    animateRain();
    window.addEventListener('resize', function () {
        resizeCanvas();
        if (reducedMotion) {
            animateRain();
        }
    });
})();

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
