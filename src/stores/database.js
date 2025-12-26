import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { readSqliteFile, openDatabase, executeQuery, closeDatabase, insertIntoDatabase, updateDatabase } from '@/js/database/sql-manager.js'

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
    console.log("!!! LA BASE EST DEVENUE SALE (Dirty) !!!");
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
          // Les colonnes sont dans values[x][1] (nom de la colonne)
          const columns = resVolInfo.data[0].values.map(row => row[1]);
          if (!columns.includes('V_Tag')) {
            console.log("Migration : Ajout de la colonne V_Tag à la table Vol");
            const alterSQL = "ALTER TABLE Vol ADD COLUMN V_Tag INTEGER";
            executeQuery(db.value, alterSQL);
            markAsDirty();
          }
        }

        // Vérification / Création de la table Tag
        const resTag = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Tag'")
        if (resTag.success && resTag.data.length === 0) {
          const createSQL = `CREATE TABLE Tag (Tag_ID INTEGER PRIMARY KEY, Tag_Label TEXT, Tag_Color TEXT)`
          executeQuery(db.value, createSQL)
          const defaults = [
            [1, 'Tag 1', '#F44336'], // Red
            [2, 'Tag 2', '#FF9800'], // Orange
            [3, 'Tag 3', '#FFEB3B'], // Yellow
            [4, 'Tag 4', '#4CAF50'], // Green
            [5, 'Tag 5', '#2196F3']  // Blue
          ]
          defaults.forEach(d => {
            executeQuery(db.value, `INSERT INTO Tag (Tag_ID, Tag_Label, Tag_Color) VALUES (${d[0]}, '${d[1]}', '${d[2]}')`)
          })
          // Mark as dirty because we modified the structure/content
          markAsDirty()
        }
        // Vérification / Création de la table Equip
        const resEquip = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Equip'")
        if (resEquip.success && resEquip.data.length === 0) {
          const creaEquip = 'CREATE TABLE Equip (M_ID integer NOT NULL PRIMARY KEY, M_Date TimeStamp, M_Engin varchar(30), M_Event varchar(30), M_Price double, M_Comment Long Text)';
          executeQuery(db.value, creaEquip);
          markAsDirty();
        }



        isOpen.value = true
        dbName.value = file.name
        // Lors d'un chargement tout neuf, on est "propre"
        // Si aucune migration n'a eu lieu, on confirme que c'est propre.
        // Sinon (isDirty == true), on le laisse tel quel pour déclencher l'autosave.
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
      return db.value.export();
    }
    throw new Error("Base non initialisée");
  }

  function insert(tableName, params) {
    if (!db.value) {
      return { success: false, message: 'No database open' }
    }
    const result = insertIntoDatabase(db.value, tableName, params)

    // SI L'INSERTION RÉUSSIT : on marque la base comme modifiée
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

  /*
  * An insertion will be made with const result = databaseStore.insert(sqltable, sqlparams);
  * sqltable is the name of the table in which we want to insert data
  * with sqlparams an object of the type:
  *    const sqlparams = {
  *       S_Nom: 'Test Site',   the field names must match those in the table.
  *       S_CP: '***',
  *       S_Type: 'D',
  *       S_Maj: '2025-12-18',
  *    }; 
  * if (result.success) {
  *   console.log('Row inserted, ID:', result.lastInsertId);
  * } else {
  */
  function insert(tableName, params) {
    if (!db.value) {
      return { success: false, message: 'No database open' }
    }
    return insertIntoDatabase(db.value, tableName, params)
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
    // État
    db,
    isOpen,
    dbName,
    error,
    // Getters
    hasOpenDatabase,
    isDirty,
    // Actions
    loadDatabase,
    exportDatabase,
    closeDatabaseStore,
    markAsSaved,
    clearError,
    query,
    insert,
    update
  }
})
