
/**
 * Extracts and concatenates IGC data from multiple tracks.
 * Replicates the logic from the legacy mergingIGC.java.
 * 
 * @param {Array<string>} tracks - Array of IGC file contents, ordered chronologically.
 * @returns {string} The merged IGC content.
 */
export function mergeIgcTracks(tracks) {
    if (!tracks || tracks.length === 0) return '';

    let mergedIgc = '';

    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track) continue;

        // Handle different line endings (LF or CR)
        let lines = [];
        if (track.includes('\r\n')) {
            lines = track.split('\r\n');
        } else if (track.includes('\n')) {
            lines = track.split('\n');
        } else if (track.includes('\r')) {
            lines = track.split('\r');
        } else {
            // Unrecognized or single line
            lines = [track];
        }

        if (lines.length > 3) {
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line === '') continue;

                const debChar = line.substring(0, 1).toUpperCase();

                if (i === 0) {
                    // First track: keep A, H, and valid B records
                    if (debChar === 'A' || debChar === 'H') {
                        mergedIgc += line + '\n';
                    } else if (debChar === 'B' && line.length > 23) {
                        mergedIgc += line + '\n';
                    }
                } else {
                    // Subsequent tracks: keep ONLY valid B records
                    if (debChar === 'B' && line.length > 23) {
                        mergedIgc += line + '\n';
                    }
                }
            }
        }
    }

    return mergedIgc;
}
