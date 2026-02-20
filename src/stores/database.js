import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { readSqliteFile, openDatabase, executeQuery, closeDatabase, insertIntoDatabase, updateDatabase, createNewDatabase } from '@/js/database/sql-manager.js'

export const useDatabaseStore = defineStore('database', () => {
    // État
    const db = ref(null)
    const isOpen = ref(false)
    const dbName = ref('')
    const error = ref('')
    const isDirty = ref(false)

    // Getters
    const hasOpenDatabase = computed(() => isOpen.value && db.value !== null)

    // Actions privées de gestion d'état (internes au store)
    function markAsDirty() {
        isDirty.value = true
    }

    function markAsSaved() {
        isDirty.value = false
    }

    // Actions publiques
    async function loadDatabase(file) {
        try {
            error.value = ''
            markAsSaved() // Reset dirty state at start
            if (db.value) { closeDatabase(db.value) }

            const fileBuffer = await readSqliteFile(file)
            db.value = await openDatabase(fileBuffer)

            const result = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Vol'")

            if (result.success) {
                if (result.data.length === 0) {
                    closeDatabase(db.value)
                    db.value = null
                    throw new Error('The database does not contain a "Vol" table')
                }

                // Vérification de la présence de la colonne V_Tag dans la table Vol
                const resVolInfo = executeQuery(db.value, "PRAGMA table_info(Vol)")
                if (resVolInfo.success && resVolInfo.data[0]) {
                    const columns = resVolInfo.data[0].values.map(row => row[1])
                    if (!columns.includes('V_Tag')) {
                        console.log("Migration : Ajout de la colonne V_Tag à la table Vol")
                        executeQuery(db.value, "ALTER TABLE Vol ADD COLUMN V_Tag INTEGER")
                        markAsDirty()
                    }
                }

                // Vérification / Création de la table Tag
                const resTag = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Tag'")
                if (resTag.success && resTag.data.length === 0) {
                    executeQuery(db.value, `CREATE TABLE Tag (Tag_ID INTEGER PRIMARY KEY, Tag_Label TEXT, Tag_Color TEXT)`)
                    const defaults = [
                        [1, 'Tag 1', '#F44336'],
                        [2, 'Tag 2', '#FF9800'],
                        [3, 'Tag 3', '#FFEB3B'],
                        [4, 'Tag 4', '#4CAF50'],
                        [5, 'Tag 5', '#2196F3']
                    ]
                    defaults.forEach(d => {
                        executeQuery(db.value, `INSERT INTO Tag (Tag_ID, Tag_Label, Tag_Color) VALUES (${d[0]}, '${d[1]}', '${d[2]}')`)
                    })
                    markAsDirty()
                }

                // Vérification / Création de la table Equip
                const resEquip = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Equip'")
                if (resEquip.success && resEquip.data.length === 0) {
                    executeQuery(db.value, 'CREATE TABLE Equip (M_ID integer NOT NULL PRIMARY KEY, M_Date TimeStamp, M_Engin varchar(30), M_Event varchar(30), M_Price double, M_Comment Long Text)')
                    markAsDirty()
                }

                isOpen.value = true
                dbName.value = file.name
                // Si aucune migration n'a eu lieu, on confirme que c'est propre.
                // Sinon (isDirty == true), l'autosave sera déclenché.
                if (!isDirty.value) {
                    markAsSaved()
                }
                return { success: true }
            } else {
                throw new Error(result.message || 'Error while executing the open request')
            }
        } catch (e) {
            error.value = e.message || 'Error loading database'
            isOpen.value = false
            db.value = null
            dbName.value = ''
            markAsSaved()
            return { success: false, error: error.value }
        }
    }

    async function exportDatabase() {
        if (db.value) {
            return db.value.export()
        }
        throw new Error("Base non initialisée")
    }

    async function createNewLogbook(name = 'newlogbook.db') {
        try {
            error.value = ''
            markAsSaved()
            if (db.value) { closeDatabase(db.value) }

            db.value = await createNewDatabase()
            isOpen.value = true
            dbName.value = name

            return { success: true }
        } catch (e) {
            error.value = e.message || 'Error creating new database'
            isOpen.value = false
            db.value = null
            dbName.value = ''
            return { success: false, error: error.value }
        }
    }

    function insert(tableName, params) {
        if (!db.value) {
            return { success: false, message: 'No database open' }
        }
        const result = insertIntoDatabase(db.value, tableName, params)
        if (result.success) {
            markAsDirty()
        }
        return result
    }

    function closeDatabaseStore() {
        if (db.value) {
            closeDatabase(db.value)
        }
        db.value = null
        isOpen.value = false
        dbName.value = ''
        error.value = ''
    }

    function clearError() {
        error.value = ''
    }

    function query(sql) {
        if (!db.value) {
            return { success: false, message: 'No database open', data: [] }
        }
        return executeQuery(db.value, sql)
    }

    function update(sql, params) {
        if (!db.value) {
            return { success: false, message: 'No database open' }
        }
        const result = updateDatabase(db.value, sql, params)
        if (result.success) {
            markAsDirty()
        }
        return result
    }

    return {
        // State
        db,
        isOpen,
        dbName,
        error,
        isDirty,
        // Getters
        hasOpenDatabase,
        // Actions
        loadDatabase,
        createNewLogbook,
        exportDatabase,
        closeDatabaseStore,
        markAsDirty,
        markAsSaved,
        clearError,
        query,
        insert,
        update,
    }
})
