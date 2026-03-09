// ==========================================
// BACKEND: BITÁCORA DE MANTENCIÓN RAHUE
// Archivo: Code_Bitacora.gs
// ==========================================

// ID de la Hoja de Cálculo donde se guardarán los datos
// (Reemplaza esto con el ID real de tu hoja "MANTENCIÓN")
const SHEET_ID = "1ahgD4zXAl86JvT5F0PQIfUIzvX54L1ZFgrAacd-lcAw";
const SHEET_NAME = "MANTENCIÓN";

function doPost(e) {
  try {
    // Safety check: ensure postData exists
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No se recibieron datos (postData is empty)" });
    }

    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === "MAINTENANCE_LOG") {
      return saveMaintenanceLog(params);
    } else if (action === "GET_LOGS") {
        return getLogs(params);
    } else {
      return jsonResponse({ status: "error", message: "Acción desconocida" });
    }

  } catch (error) {
    return jsonResponse({ status: "error", message: "Error Interno: " + error.toString() });
  }
}

function saveMaintenanceLog(data) {
  // data = { worker: "Nombre", fecha_trabajo: "YYYY-MM-DD", tasks: ["Tarea 1", "Tarea 2"] }

  try {
    // Abrir la hoja de cálculo por ID
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Si no encuentra la hoja por nombre, usa la primera
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    const timestamp = new Date(); // B: Momento exacto del registro

    // C: FECHA_TRABAJO — usa la fecha enviada por el usuario, o hoy como respaldo
    let workDate;
    if (data.fecha_trabajo) {
      // El frontend envía "YYYY-MM-DD"; parseamos como fecha local
      const parts = data.fecha_trabajo.split('-');
      workDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      workDate = new Date(); // Respaldo: fecha de hoy
    }

    // Derivar semana, mes y año desde la fecha de trabajo seleccionada
    const tz = ss.getSpreadsheetTimeZone();
    const week  = Utilities.formatDate(workDate, tz, "w");
    const month = Utilities.formatDate(workDate, tz, "MMMM");
    const year  = Utilities.formatDate(workDate, tz, "yyyy");

    const newRows = [];

    // Por cada tarea en la lista, creamos una fila
    data.tasks.forEach(function(task) {
      const uniqueId = "LOG-" + Math.floor(Math.random() * 1000000).toString();

      newRows.push([
        uniqueId,      // A: ID
        timestamp,     // B: FECHA_REGISTRO (momento del envío)
        workDate,      // C: FECHA_TRABAJO  (fecha elegida por el usuario)
        data.worker,   // D: TECNICO
        task,          // E: TAREA
        week,          // F: SEMANA
        month,         // G: MES
        year           // H: AÑO
      ]);
    });

    // Guardar en bloque (más rápido)
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
    }

    return jsonResponse({ status: "success", message: "Registros guardados: " + newRows.length });

  } catch (e) {
    return jsonResponse({ status: "error", message: "Error al guardar: " + e.toString() });
  }
}

function getLogs(params) {
    try {
        const ss = SpreadsheetApp.openById(SHEET_ID);
        let sheet = ss.getSheetByName(SHEET_NAME);
        if (!sheet) sheet = ss.getSheets()[0];

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) return jsonResponse({ status: "success", logs: [] }); // Empty sheet

        // Read last 100 rows for performance
        const startRow = Math.max(2, lastRow - 99);
        const numRows = lastRow - startRow + 1;
        const data = sheet.getRange(startRow, 1, numRows, 8).getValues(); // Read columns A-H

        // Map array to object
        // Columns: 0:ID, 1:Timestamp, 2:WorkDate, 3:Worker, 4:Task, 5:Week, 6:Month, 7:Year
        const logs = data.map(row => ({
            id: row[0],
            date: row[2], // Use WorkDate for display
            worker: row[3],
            task: row[4],
            month: row[6]
        })).reverse(); // Newest first

        return jsonResponse({ status: "success", logs: logs });

    } catch (e) {
        return jsonResponse({ status: "error", message: "Error al leer logs: " + e.toString() });
    }
}

// Utilitario para responder JSON
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Función de prueba GET para verificar que el script está vivo
function doGet(e) {
  return ContentService.createTextOutput("Backend Bitácora de Mantención Rahue - ACTIVO");
}
