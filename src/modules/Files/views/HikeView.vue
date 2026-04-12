<template>
    <v-snackbar v-model="snackbar" :timeout="5000" color="success" location="top">
        {{ snackbarMessage }}
        <template v-slot:actions>
            <v-btn variant="text" @click="snackbar = false">
                <v-icon>mdi-close</v-icon>
            </v-btn>
        </template>
    </v-snackbar>

    <OpenLogbook :show="true" />

    <div v-if="databaseStore.hasOpenDatabase" class="hikes-layout">
        <!-- Left panel: Map -->
        <div class="left-panel">
            <LittleMapView ref="littleMapRef" :hideOverlay="true" :zoomLevel="13" />
        </div>

        <!-- Right panel: Search, Table, Details -->
        <div class="right-panel">
            <!-- Search bar -->
            <div class="top-block">
                <v-text-field v-model="search" :label="$gettext('Search')" prepend-inner-icon="mdi-magnify" single-line
                    hide-details clearable density="compact" variant="outlined" class="search-field" />
            </div>

            <!-- Empty table alert -->
            <v-alert v-if="showEmptyAlert" type="info" variant="tonal" density="compact" closable
                @click:close="showEmptyAlert = false" class="mb-2">
                <template v-slot:title>{{ $gettext('No hike recorded') }}</template>
                {{ $gettext('Would you like to add a new hike') }}?
                <template v-slot:append>
                    <v-btn color="primary" variant="flat" size="small" class="ml-2"
                        @click="showEmptyAlert = false; openNewHikeDialog()">
                        <v-icon start>mdi-plus</v-icon>
                        {{ $gettext('Add') }}
                    </v-btn>
                </template>
            </v-alert>

            <!-- Hikes table -->
            <div class="table-block">
                <v-data-table v-model="selectedItems" :headers="headers" :items="filteredHikes" :search="search"
                    item-value="R_ID" density="compact" class="hikes-table" :items-per-page="-1">
                    <template v-slot:item="{ item, props }">
                        <tr v-bind="props" :class="{
                            'selected-row': selectedItems.includes(item.R_ID),
                            'has-comment': item.R_Commentaire
                        }" @click="selectedItems = [item.R_ID]; onSelectionChange(item)" style="cursor:pointer;">
                            <td class="col-nom">{{ item.R_Nom }}</td>
                            <td class="col-depart">{{ item.R_Depart }}</td>
                            <td class="col-arrivee">{{ item.R_Arrivee }}</td>
                            <td class="col-deniv">{{ item.R_Deniv }}</td>
                            <td class="col-duree">{{ item.R_sDuree }}</td>
                            <td class="col-track">
                                <v-icon v-if="item.R_Track" size="16" color="primary">mdi-map-marker-path</v-icon>
                            </td>
                        </tr>
                    </template>
                    <template v-slot:bottom />
                </v-data-table>
            </div>

            <!-- Details panel -->
            <div class="bottom-block">
                <v-card v-if="selectedHike" class="details-card" translate="no">
                    <v-card-title class="d-flex justify-space-between align-center">
                        <v-chip color="primary" label class="mr-2">
                            {{ selectedHike.R_Nom }}
                        </v-chip>
                        <div class="text-right flex-grow-1">
                            {{ $gettext('Hike details') }}
                        </div>
                    </v-card-title>

                    <v-tabs v-model="tab" color="primary" class="bg-grey-lighten-4">
                        <v-tab value="about">
                            <v-icon class="mr-2">mdi-information-outline</v-icon>
                            {{ $gettext('About') }}
                        </v-tab>
                        <v-tab value="comment">
                            <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
                            {{ $gettext('Comment') }}
                        </v-tab>
                        <v-tab value="utilities">
                            <v-icon class="mr-2">mdi-wrench-outline</v-icon>
                            {{ $gettext('Utilities') }}
                        </v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <!-- ABOUT TAB -->
                        <v-window-item value="about">
                            <v-card-text>
                                <div class="about-block">
                                    <div class="about-row info-row">
                                        <span class="info-bold">{{ $gettext('Name') }}</span>
                                        <span>{{ selectedHike.R_Nom }}</span>
                                        <span class="info-bold">{{ $gettext('Start') }}</span>
                                        <span>{{ selectedHike.R_Depart || '-' }}</span>
                                        <span class="info-bold">{{ $gettext('End') }}</span>
                                        <span>{{ selectedHike.R_Arrivee || '-' }}</span>
                                    </div>
                                    <div class="about-row info-row">
                                        <span class="info-bold">{{ $gettext('Elevation gain') }}</span>
                                        <span>{{ selectedHike.R_Deniv || 0 }} m</span>
                                        <span class="info-bold">{{ $gettext('Duration') }}</span>
                                        <span>{{ selectedHike.R_sDuree || '-' }}</span>
                                    </div>
                                    <div class="about-row btn-row">
                                        <v-btn color="primary" density="compact" class="mr-2"
                                            @click="openNewHikeDialog">
                                            <v-icon start>mdi-plus</v-icon>
                                            {{ $gettext('Add') }}
                                        </v-btn>
                                        <v-btn color="error" density="compact" class="mr-2" @click="onDeleteHike">
                                            <v-icon start>mdi-delete</v-icon>
                                            {{ $gettext('Delete') }}
                                        </v-btn>
                                        <v-btn color="warning" density="compact" @click="openEditHikeDialog">
                                            <v-icon start>mdi-pencil</v-icon>
                                            {{ $gettext('Modify') }}
                                        </v-btn>
                                    </div>
                                </div>
                            </v-card-text>
                        </v-window-item>

                        <!-- COMMENT TAB -->
                        <v-window-item value="comment">
                            <v-card-text>
                                <v-textarea v-model="commentText" :label="$gettext('Add a comment')" rows="3"
                                    variant="outlined" density="compact" />
                                <div class="comment-btn-row">
                                    <v-btn color="error" density="compact" class="mr-2" @click="onDeleteComment">
                                        {{ $gettext('Delete') }}
                                    </v-btn>
                                    <v-btn color="primary" density="compact" @click="onValidateComment">
                                        {{ $gettext('OK') }}
                                    </v-btn>
                                </div>
                            </v-card-text>
                        </v-window-item>

                        <!-- UTILITIES TAB -->
                        <v-window-item value="utilities">
                            <v-card-text>
                                <div class="utilities-btn-row">
                                    <v-btn color="secondary" density="compact" class="mr-3"
                                        :disabled="!selectedHike?.R_Track" @click="exportIgc">
                                        <v-icon start>mdi-file-export</v-icon>
                                        {{ $gettext('Export IGC') }}
                                    </v-btn>
                                    <v-btn color="secondary" density="compact" class="mr-3"
                                        :disabled="!selectedHike?.R_Track" @click="exportGpx">
                                        <v-icon start>mdi-share-variant</v-icon>
                                        {{ $gettext('Export GPX') }}
                                    </v-btn>
                                    <!-- UPDATE DATABASE 
                                        Ajouté pour achever la conversion fusion de deux carnets : randos et vols
                                        Pour chaque enregistrement de la table Rando, décodage la trace Igc
                                            - mise à jour R_Deniv
                                            - mise à jour R_Duree
                                            - mise à jour R_sDuree
                                            - mise à jour 	"R_Lat_Depart"	
                                            - mise à jour 	"R_Long_Depart"	
                                            - mise à jour "R_Lat_Fin"	
                                            - mise à jour "R_Long_Fin"
                                            - update de l'enregistrement 
                                            - rechercher tous les enregistrements de la table Vol comportant un champ Vol.V_R_ID égal au Rando.R_ID de l'enregistrement qui vient d'être modifié. Pour chacun d'eux 
                                                - mise à jour V_R_Deniv"	avec Rando.R_deniv
                                                - mise à jour	V_R_sDuree avec Rando.R_sDuree
                                                - mise à jour	V_R_Duree avec Rando.R_Duree
                                                - update de l'enregistrement 
                         
                                    <v-btn color="warning" density="compact" @click="updateDatabase">
                                        <v-icon start>mdi-database-refresh</v-icon>
                                        Update
                                    </v-btn>
                                -->

                                </div>
                            </v-card-text>
                        </v-window-item>
                    </v-window>
                </v-card>

                <div v-else class="no-hike-message">
                    <p>{{ $gettext('Select a hike to display details') }}</p>
                </div>
            </div>
        </div>

        <!-- HikeForm Dialog -->
        <v-dialog v-model="showHikeDialog" max-width="920" persistent>
            <HikeForm v-if="showHikeDialog" :hike="hikeFormData" @submit="handleHikeSubmit"
                @cancel="showHikeDialog = false" />
        </v-dialog>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useGettext } from 'vue3-gettext';
import OpenLogbook from '@/components/OpenLogbook.vue';
import LittleMapView from '@/components/LittleMapView.vue';
import HikeForm from '@/components/HikeForm.vue';
import { useDatabaseStore } from '@/stores/database';
import { igcDecoding } from '@/js/igc/igc-decoder.js';
import { igcToGpx } from '@/js/igc/igc-to-gpx.js';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

const emit = defineEmits(['dbUpdated']);

// State
const hikes = ref([]);
const selectedItems = ref([]);
const selectedHike = ref(null);
const search = ref('');
const tab = ref('about');
const commentText = ref('');
const littleMapRef = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');

// HikeForm Dialog
const showHikeDialog = ref(false);
const hikeFormData = ref(null);

// Empty table alert
const showEmptyAlert = ref(false);

// Table headers
const headers = [
    { title: $gettext('Name'), key: 'R_Nom', sortable: true },
    { title: $gettext('Start'), key: 'R_Depart', sortable: true },
    { title: $gettext('End'), key: 'R_Arrivee', sortable: true },
    { title: $gettext('Elev. (m)'), key: 'R_Deniv', sortable: true, width: '8%' },
    { title: $gettext('Duration'), key: 'R_sDuree', sortable: true, width: '10%' },
    { title: '', key: 'R_Track', sortable: false, width: '4%' },
];

// Computed
const filteredHikes = computed(() => {
    if (!search.value) return hikes.value;
    const searchLower = search.value.toLowerCase();
    return hikes.value.filter(h =>
        (h.R_Nom && h.R_Nom.toLowerCase().includes(searchLower)) ||
        (h.R_Depart && h.R_Depart.toLowerCase().includes(searchLower)) ||
        (h.R_Arrivee && h.R_Arrivee.toLowerCase().includes(searchLower))
    );
});


// Lifecycle
onMounted(async () => {
    if (databaseStore.hasOpenDatabase) {
        loadHikes();
    }
});

// Watch database
watch(() => databaseStore.hasOpenDatabase, (hasDb) => {
    if (hasDb) loadHikes();
});

// Watch selected hike → update comment
watch(selectedHike, (newHike) => {
    commentText.value = newHike?.R_Commentaire || '';
});

// Watch search
watch(search, async () => {
    await nextTick();
    selectFirstHike();
});

function selectFirstHike() {
    if (filteredHikes.value.length > 0) {
        const first = filteredHikes.value[0];
        selectedItems.value = [first.R_ID];
        selectedHike.value = first;
        displayHikeOnMap(first);
    } else {
        selectedItems.value = [];
        selectedHike.value = null;
    }
}

/**
 * Load all hikes from Rando table
 */
async function loadHikes() {
    if (!databaseStore.hasOpenDatabase) return;

    const sql = `SELECT R_ID, R_Nom, R_Depart, R_Arrivee, R_Deniv, R_sDuree, R_Duree,
               R_Track, R_Lat_Depart, R_Long_Depart, R_Lat_Fin, R_Long_Fin, R_Commentaire
               FROM Rando ORDER BY R_Nom`;
    const result = databaseStore.query(sql);

    if (result.success && result.data && result.data[0] && result.data[0].values.length > 0) {
        const columns = result.data[0].columns;
        const values = result.data[0].values;
        hikes.value = values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => { obj[col] = row[idx]; });
            return obj;
        });
        showEmptyAlert.value = false;
        await nextTick();
        setTimeout(() => selectFirstHike(), 200);
    } else {
        hikes.value = [];
        showEmptyAlert.value = true;
    }
}

function onSelectionChange(hike) {
    selectedHike.value = hike;
    displayHikeOnMap(hike);
}

/**
 * Display hike on map: track (IGC) or two markers
 */
async function displayHikeOnMap(hike) {
    if (!hike || !littleMapRef.value) return;
    await nextTick();

    if (hike.R_Track) {
        // Decode IGC and display track
        try {
            const result = await igcDecoding(hike.R_Track);
            if (result.success) {
                const map = littleMapRef.value;
                if (map && typeof map.displayHikeTrack === 'function') {
                    map.displayHikeTrack(result.data.GeoJSON);
                } else {
                    // Fallback: display using displayGeoJsonDirect if exposed
                    displayTrackOnLittleMap(result.data.GeoJSON, hike);
                }
            }
        } catch (err) {
            console.error('IGC decoding error:', err);
        }
    } else if (hike.R_Lat_Depart && hike.R_Long_Depart) {
        // No track: show two markers
        if (littleMapRef.value.displayHikePoints) {
            littleMapRef.value.displayHikePoints(
                hike.R_Lat_Depart, hike.R_Long_Depart,
                hike.R_Lat_Fin, hike.R_Long_Fin,
                hike.R_Nom
            );
        } else {
            // Fallback to single marker via displayTakeoffOnly
            littleMapRef.value.displayTakeoffOnly(
                hike.R_Lat_Depart, hike.R_Long_Depart,
                hike.R_Nom, 0, 'D'
            );
        }
    }
}

/**
 * Internal: display track on LittleMapView via geoJson prop approach using Leaflet directly
 * Since LittleMapView doesn't have a displayHikeTrack method, we manage our own overlay map.
 */
function displayTrackOnLittleMap(geoJson, hike) {
    // LittleMapView exposes displayTakeoffOnly; for tracks we rely on its geoJson prop
    // Since geoJson is a prop and we can't bind it dynamically here,
    // we fall back to showing start marker only
    if (littleMapRef.value && littleMapRef.value.displayTakeoffOnly) {
        littleMapRef.value.displayTakeoffOnly(
            hike.R_Lat_Depart || 0, hike.R_Long_Depart || 0,
            hike.R_Nom, 0, 'D'
        );
    }
}

/**
 * Open dialog to create new hike
 */
function openNewHikeDialog() {
    hikeFormData.value = null;
    showHikeDialog.value = true;
}

/**
 * Open dialog to edit selected hike
 */
function openEditHikeDialog() {
    if (!selectedHike.value) return;
    hikeFormData.value = {
        id: selectedHike.value.R_ID,
        nom: selectedHike.value.R_Nom,
        depart: selectedHike.value.R_Depart,
        arrivee: selectedHike.value.R_Arrivee,
        deniv: selectedHike.value.R_Deniv,
        sDuree: selectedHike.value.R_sDuree,
        duree: selectedHike.value.R_Duree,
        track: selectedHike.value.R_Track,
        latDepart: selectedHike.value.R_Lat_Depart,
        longDepart: selectedHike.value.R_Long_Depart,
        latFin: selectedHike.value.R_Lat_Fin,
        longFin: selectedHike.value.R_Long_Fin,
        newHike: false
    };
    showHikeDialog.value = true;
}

/**
 * Handle hike form submission
 */
function handleHikeSubmit(hikeData) {
    showHikeDialog.value = false;
    if (hikeData.newHike) {
        insertHike(hikeData);
    } else {
        updateHike(hikeData);
    }
}

/**
 * Insert new hike
 */
function insertHike(hikeData) {
    const params = {
        R_Nom: hikeData.nom,
        R_Depart: hikeData.depart,
        R_Arrivee: hikeData.arrivee,
        R_Deniv: hikeData.deniv || 0,
        R_sDuree: hikeData.sDuree,
        R_Duree: hikeData.duree || 0,
        R_Track: hikeData.track || null,
        R_Lat_Depart: hikeData.latDepart || 0,
        R_Long_Depart: hikeData.longDepart || 0,
        R_Lat_Fin: hikeData.latFin || 0,
        R_Long_Fin: hikeData.longFin || 0,
        R_Commentaire: ''
    };

    const result = databaseStore.insert('Rando', params);
    if (result.success) {
        snackbarMessage.value = $gettext('Hike created successfully');
        snackbar.value = true;
        loadHikes();
        emit('dbUpdated');
    } else {
        snackbarMessage.value = $gettext('Error creating hike');
        snackbar.value = true;
    }
}

/**
 * Update existing hike
 */
function updateHike(hikeData) {
    const sql = `UPDATE Rando SET
    R_Nom = '${escStr(hikeData.nom)}',
    R_Depart = '${escStr(hikeData.depart)}',
    R_Arrivee = '${escStr(hikeData.arrivee)}',
    R_Deniv = ${hikeData.deniv || 0},
    R_sDuree = '${escStr(hikeData.sDuree)}',
    R_Duree = ${hikeData.duree || 0},
    R_Track = ${hikeData.track ? `'${escStr(hikeData.track)}'` : 'NULL'},
    R_Lat_Depart = ${hikeData.latDepart || 0},
    R_Long_Depart = ${hikeData.longDepart || 0},
    R_Lat_Fin = ${hikeData.latFin || 0},
    R_Long_Fin = ${hikeData.longFin || 0}
    WHERE R_ID = ${hikeData.id}`;

    const result = databaseStore.update(sql);
    if (result.success) {
        snackbarMessage.value = $gettext('Hike updated successfully');
        snackbar.value = true;
        loadHikes();
        emit('dbUpdated');
        const updated = hikes.value.find(h => h.R_ID === hikeData.id);
        if (updated) onSelectionChange(updated);
    } else {
        snackbarMessage.value = $gettext('Error updating hike');
        snackbar.value = true;
    }
}

/**
 * Delete selected hike
 */
function onDeleteHike() {
    if (!selectedHike.value) return;
    const name = selectedHike.value.R_Nom;
    if (confirm(`${$gettext('Delete hike')} "${name}" ?`)) {
        const sql = `DELETE FROM Rando WHERE R_ID = ${selectedHike.value.R_ID}`;
        const result = databaseStore.update(sql);
        if (result.success) {
            snackbarMessage.value = $gettext('Hike deleted');
            snackbar.value = true;
            loadHikes();
            emit('dbUpdated');
        } else {
            snackbarMessage.value = $gettext('Error deleting hike');
            snackbar.value = true;
        }
    }
}

/**
 * Delete comment
 */
function onDeleteComment() {
    commentText.value = '';
    onValidateComment();
}

/**
 * Save comment
 */
function onValidateComment() {
    if (!selectedHike.value) return;
    const sql = `UPDATE Rando SET R_Commentaire = '${escStr(commentText.value)}' WHERE R_ID = ${selectedHike.value.R_ID}`;
    const result = databaseStore.update(sql);
    if (result.success) {
        selectedHike.value.R_Commentaire = commentText.value;
        const idx = hikes.value.findIndex(h => h.R_ID === selectedHike.value.R_ID);
        if (idx !== -1) hikes.value[idx].R_Commentaire = commentText.value;
        snackbarMessage.value = commentText.value ? $gettext('Comment saved') : $gettext('Comment deleted');
        snackbar.value = true;
        emit('dbUpdated');
    }
}

/**
 * Export IGC
 */
function exportIgc() {
    if (!selectedHike.value || !selectedHike.value.R_Track) {
        snackbarMessage.value = $gettext('No IGC data for this hike');
        snackbar.value = true;
        return;
    }
    const igcData = selectedHike.value.R_Track;
    const name = selectedHike.value.R_Nom || 'Hike';
    const blob = new Blob([igcData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.igc`.replace(/[^a-zA-Z0-9._-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export GPX
 */
async function exportGpx() {
    if (!selectedHike.value || !selectedHike.value.R_Track) {
        snackbarMessage.value = $gettext('No IGC data for this hike');
        snackbar.value = true;
        return;
    }
    const igcData = selectedHike.value.R_Track;
    const name = selectedHike.value.R_Nom || 'Hike';

    const decoded = await igcDecoding(igcData);
    if (!decoded.success || !decoded.data.fixes) {
        snackbarMessage.value = $gettext('Could not decode IGC data');
        snackbar.value = true;
        return;
    }

    const gpxContent = igcToGpx(decoded.data);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.gpx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Update database with IGC data for all hikes
 */
async function updateDatabase() {
    if (!databaseStore.hasOpenDatabase) {
        snackbarMessage.value = $gettext('Database not open');
        snackbar.value = true;
        return;
    }

    try {
        snackbarMessage.value = $gettext('Database update started...');
        snackbar.value = true;

        const sqlRando = "SELECT R_ID, R_Track FROM Rando WHERE R_Track IS NOT NULL";
        const resultRando = databaseStore.query(sqlRando);

        if (resultRando.success && resultRando.data && resultRando.data[0] && resultRando.data[0].values.length > 0) {
            const columns = resultRando.data[0].columns;
            const values = resultRando.data[0].values;

            let updatedCount = 0;

            // Iterate over all hikes
            for (const row of values) {
                const hike = {};
                columns.forEach((col, idx) => { hike[col] = row[idx]; });

                if (hike.R_Track) {
                    const decodedResult = await igcDecoding(hike.R_Track);

                    if (decodedResult.success && decodedResult.data) {
                        const decoded = decodedResult.data;
                        const fixes = decoded.fixes;

                        if (fixes && fixes.length >= 2) {
                            const latDepart = parseFloat(fixes[0].latitude).toFixed(5);
                            const longDepart = parseFloat(fixes[0].longitude).toFixed(5);
                            const latFin = parseFloat(fixes[fixes.length - 1].latitude).toFixed(5);
                            const longFin = parseFloat(fixes[fixes.length - 1].longitude).toFixed(5);

                            const totalSecs = decoded.stat.duration || 0;
                            const hours = Math.floor(totalSecs / 3600);
                            const minutes = Math.floor((totalSecs % 3600) / 60);
                            const sDuree = `${hours}h${String(minutes).padStart(2, '0')}mn`;

                            const maxAlt = decoded.stat.maxalt?.gps || 0;
                            const minAlt = decoded.stat.minialt?.gps || 0;
                            const deniv = Math.max(0, Math.round(maxAlt - minAlt));

                            // 1. Update Rando
                            const updateRandoSql = `UPDATE Rando SET 
                                R_Deniv = ${deniv},
                                R_Duree = ${totalSecs},
                                R_sDuree = '${escStr(sDuree)}',
                                R_Lat_Depart = ${latDepart},
                                R_Long_Depart = ${longDepart},
                                R_Lat_Fin = ${latFin},
                                R_Long_Fin = ${longFin}
                                WHERE R_ID = ${hike.R_ID}`;

                            const resRandoUpdate = databaseStore.update(updateRandoSql);

                            if (resRandoUpdate.success) {
                                updatedCount++;
                                // 2. Update Vol
                                const updateVolSql = `UPDATE Vol SET 
                                    V_R_Deniv = ${deniv},
                                    V_R_Duree = ${totalSecs},
                                    V_R_sDuree = '${escStr(sDuree)}'
                                    WHERE V_R_ID = ${hike.R_ID}`;
                                databaseStore.update(updateVolSql);
                            }
                        }
                    }
                }
            }

            snackbarMessage.value = `${$gettext('Database updated.')} (${updatedCount} hikes)`;
            snackbar.value = true;

            // Reload hikes and emit event to update map/list
            loadHikes();
            emit('dbUpdated');
        } else {
            snackbarMessage.value = $gettext('No hikes with track found to update');
            snackbar.value = true;
        }
    } catch (err) {
        console.error('Error updating database:', err);
        snackbarMessage.value = $gettext('Error updating database');
        snackbar.value = true;
    }
}

/**
 * Escape single quotes for SQL
 */
function escStr(str) {
    return (str || '').toString().replace(/'/g, "''");
}
</script>

<style scoped>
.hikes-layout {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: calc(100vh - 120px);
    margin: 0;
    padding: 10px;
    gap: 2vw;
    box-sizing: border-box;
}

.left-panel,
.right-panel {
    width: 50%;
    height: 100%;
    box-sizing: border-box;
}

.left-panel {
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.right-panel {
    display: flex;
    flex-direction: column;
    padding-right: 70px;
    gap: 10px;
}

.top-block {
    width: 100%;
    height: auto;
    min-height: 50px;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 10px 20px;
    flex-shrink: 0;
}

.search-field {
    flex: 1;
}

.table-block {
    width: 100%;
    flex: 1 1 0;
    min-height: 0;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    box-sizing: border-box;
    overflow: auto;
}

.hikes-table {
    width: 100%;
    height: 100%;
}

.hikes-table tr {
    font-size: 0.85em;
    height: 16px;
}

.hikes-table td {
    padding-top: 1px !important;
    padding-bottom: 1px !important;
}

.col-nom {
    width: 28% !important;
}

.col-depart {
    width: 22% !important;
}

.col-arrivee {
    width: 22% !important;
}

.col-deniv {
    width: 10% !important;
}

.col-duree {
    width: 14% !important;
}

.col-track {
    width: 4% !important;
}

.selected-row {
    background-color: #1867C0 !important;
    color: white;
}

.has-comment {
    color: #fbb104 !important;
    font-weight: 600;
}



.bottom-block {
    width: 100%;
    height: 39%;
    flex-shrink: 0;
    border: 2px solid #333;
    border-radius: 10px;
    box-sizing: border-box;
    overflow: hidden;
}

.details-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
}

.about-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
}

.about-row {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background: #f5f5f5;
    border-radius: 4px;
}

.info-row {
    gap: 16px;
    flex-wrap: wrap;
}

.info-bold {
    font-weight: 600;
    font-size: 0.85em;
    color: #555;
}

.btn-row {
    gap: 8px;
}

.comment-btn-row {
    display: flex;
    gap: 8px;
    margin-top: 4px;
}

.utilities-btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.no-hike-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    font-style: italic;
}

@media (max-width: 900px) {
    /* Allow horizontal scroll so the right panel (cut off on small screens) is reachable */
    .hikes-layout {
        overflow-x: auto;
        min-width: 700px; /* prevent content from collapsing below readable width */
    }
}
</style>