// ============================================
// SERMONS MODULE - Enhanced
// ============================================

const SermonsModule = {
    // Get all sermon series
    getSeries() {
        const sermons = DB.getAll('sermons');
        const seriesMap = {};
        sermons.forEach(function(s) {
            if (s.series) {
                if (!seriesMap[s.series]) {
                    seriesMap[s.series] = [];
                }
                seriesMap[s.series].push(s);
            }
        });
        return seriesMap;
    },

    // Get series progress
    getSeriesProgress(seriesName) {
        const sermons = DB.getAll('sermons').filter(function(s) { return s.series === seriesName; });
        if (sermons.length === 0) return 0;
        const total = sermons.length;
        const completed = sermons.filter(function(s) { return s.status === 'published'; }).length;
        return Math.round((completed / total) * 100);
    },

    // Render series list
    renderSeries(container) {
        const seriesMap = this.getSeries();
        const seriesNames = Object.keys(seriesMap);

        if (seriesNames.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No sermon series found</div>';
            return;
        }

        let html = `<div class="series-grid">`;
        seriesNames.forEach(function(name) {
            const sermons = seriesMap[name];
            const progress = SermonsModule.getSeriesProgress(name);
            const total = sermons.length;
            const completed = sermons.filter(function(s) { return s.status === 'published'; }).length;

            html += `
                <div class="series-card" onclick="SermonsModule.viewSeries('${name}')">
                    <h4>${name}</h4>
                    <div class="series-meta">${completed}/${total} sermons</div>
                    <div class="series-progress">
                        <div class="series-progress-bar" style="width:${progress}%;"></div>
                    </div>
                    <span style="font-size:0.75rem;color:var(--text-secondary);">${progress}% complete</span>
                </div>
            `;
        });
        html += `</div>`;

        container.innerHTML = html;
    },

    // View series details
    viewSeries(seriesName) {
        const sermons = DB.getAll('sermons').filter(function(s) { return s.series === seriesName; });
        if (sermons.length === 0) {
            showToast('No sermons in this series', 'warning');
            return;
        }

        let message = 'SERIES: ' + seriesName + '\n';
        message += '='.repeat(40) + '\n\n';

        sermons.forEach(function(s, i) {
            message += (i + 1) + '. ' + s.title + '\n';
            message += '   Preacher: ' + s.preacher + '\n';
            message += '   Date: ' + formatDate(s.date) + '\n';
            message += '   Status: ' + s.status + '\n\n';
        });

        alert(message);
    },

    // Render sermon audio player
    renderAudioPlayer(container, audioUrl, title) {
        if (!audioUrl) {
            container.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);">No audio available</div>';
            return;
        }

        container.innerHTML = `
            <div class="audio-player">
                <div class="audio-info">${title || 'Sermon Audio'}</div>
                <audio controls style="width:100%;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `;
    },

    // Upload sermon audio
    uploadAudio(event, sermonId) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            showToast('Audio file too large. Max 50MB allowed.', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            DB.update('sermons', sermonId, { audioUrl: dataUrl });
            showToast('Audio uploaded successfully', 'success');
            // Refresh the page content
            loadPageContent('sermons');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }
};