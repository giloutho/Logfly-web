import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { readSqliteFile, openDatabase, executeQuery, closeDatabase, insertIntoDatabase } from '@/js/database/sql-manager.js'

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
        isOpen.value = true
        dbName.value = file.name
        // Lors d'un chargement tout neuf, on est "propre"
        markAsSaved() 
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
    insert
  }
})
