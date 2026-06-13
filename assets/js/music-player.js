/**
 * Background Music Player
 * Handles background music play/pause functionality
 */

(function () {
    'use strict';

    function initMusicPlayer() {
        const musicToggle = document.getElementById('musicToggle');
        const bgMusic = document.getElementById('bgMusic');

        if (!musicToggle || !bgMusic) return;

        // Auto-play music on page load
        bgMusic.play()
            .then(() => musicToggle.classList.add('playing'))
            .catch(() => musicToggle.classList.remove('playing'));

        // Toggle play/pause on button click
        musicToggle.addEventListener('click', () => {
            if (bgMusic.paused) {
                bgMusic.play();
                musicToggle.classList.add('playing');
            } else {
                bgMusic.pause();
                musicToggle.classList.remove('playing');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMusicPlayer);
    } else {
        initMusicPlayer();
    }
})();
