/**
 * CONFIGURATION
 */
const CONFIG = {
    // PEGA AQUÍ EL LINK INDEPENDIENTE DE LA APP SCRIPT PARA EL CENTRO RAHUE
    API_URL: 'PEGAR_AQUI',
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for saved worker name
    const savedWorker = localStorage.getItem('maint_worker_name_rahue');
    if (savedWorker) {
        document.getElementById('maint-worker').value = savedWorker;
    }

    // Set today's date as default for FECHA_TRABAJO
    const fechaInput = document.getElementById('maint-fecha');
    if (fechaInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
    }
});

/**
 * API HANDLING
 */
function getApiUrl() {
    if (!CONFIG.API_URL || CONFIG.API_URL === 'PEGAR_AQUI') {
        alert("Falta configurar la URL del Script de Bitácora para Rahue en bitacora_mantencion.js");
        return '';
    }
    return CONFIG.API_URL;
}

async function sendTransaction(payload) {
    const url = getApiUrl();
    if (!url) return { status: "error", message: "URL no configurada" };

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Transacción error:", error);
        return { status: "error", message: "Error de conexión" };
    }
}

/**
 * UI LOGIC
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
        <span class="material-icons-round">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const icon = document.getElementById('btn-theme-toggle').querySelector('span');
    icon.innerText = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
}

/**
 * MAINTENANCE LOG LOGIC
 */
let isSubmitting = false;
let taskBatch = [];

function addTaskToBatch() {
    const taskInput = document.getElementById('maint-task');
    const taskDesc = taskInput.value.trim();

    if (taskDesc.length < 3) {
        showToast("Describe la tarea con más detalle", "error");
        taskInput.focus();
        return;
    }

    taskBatch.push(taskDesc);
    taskInput.value = "";
    renderTaskBatch();
}

function removeTaskFromBatch(index) {
    taskBatch.splice(index, 1);
    renderTaskBatch();
}

function renderTaskBatch() {
    const container = document.getElementById('maint-batch-list');
    container.innerHTML = '';

    taskBatch.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = 'batch-item';

        div.innerHTML = `
            <span>${task}</span>
            <button class="batch-remove-btn" onclick="removeTaskFromBatch(${index})" title="Eliminar">
                <span class="material-icons-round">remove_circle_outline</span>
            </button>
        `;
        container.appendChild(div);
    });
}


async function submitMaintenanceLog() {
    if (isSubmitting) return;

    const workerInput = document.getElementById('maint-worker');
    const worker = workerInput.value.trim();
    const fechaInput = document.getElementById('maint-fecha');
    const fecha = fechaInput ? fechaInput.value : '';
    const submitBtn = document.getElementById('btn-maint-submit');

    // Auto-add current input if not empty
    const currentTask = document.getElementById('maint-task').value.trim();
    if (currentTask.length >= 3) {
        taskBatch.push(currentTask);
        document.getElementById('maint-task').value = "";
        renderTaskBatch();
    }

    if (worker.length < 3) {
        showToast("Ingresa tu nombre completo", "error");
        workerInput.focus();
        return;
    }

    if (!fecha) {
        showToast("Selecciona la fecha de trabajo", "error");
        if (fechaInput) fechaInput.focus();
        return;
    }

    if (taskBatch.length === 0) {
        showToast("Agrega al menos una tarea", "error");
        return;
    }

    // Save worker name for next time
    localStorage.setItem('maint_worker_name_rahue', worker);

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons-round spin">sync</span> Enviando...';
    }

    // Payload
    const payload = {
        action: 'MAINTENANCE_LOG',
        worker: worker,
        fecha_trabajo: fecha,
        tasks: taskBatch
    };

    console.log("Enviando reporte:", payload);

    try {
        const result = await sendTransaction(payload);

        if (result.status === 'success') {
            showToast("Reporte enviado exitosamente", "success");
            taskBatch = [];
            renderTaskBatch();
        } else {
            showToast("Error: " + (result.message || "Desconocido"), "error");
        }
    } catch (e) {
        showToast("Error de conexión", "error");
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-icons-round">send</span> ENVIAR REPORTE';
        }
    }
}

/**
 * HISTORY & EXPORT LOGIC
 */

function openSheet() {
    // PEGA AQUÍ EL LINK DE TU NUEVA HOJA DE GOOGLE SHEETS PARA RAHUE
    const sheetUrl = 'PEGAR_AQUI_LINK_DE_LA_NUEVA_HOJA';
    
    if (sheetUrl === 'PEGAR_AQUI_LINK_DE_LA_NUEVA_HOJA') {
        alert("Falta configurar el enlace de la hoja de Google Sheets para Rahue en bitacora_mantencion.js (función openSheet)");
    } else {
        window.open(sheetUrl, '_blank');
    }
}

function openHistoryModal() {
    document.getElementById('modal-history').style.display = 'flex';
    loadHistory();
}

function closeHistoryModal() {
    document.getElementById('modal-history').style.display = 'none';
}

async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">Cargando...</div>';

    try {
        const result = await sendTransaction({ action: 'GET_LOGS' });

        if (result.status === 'success') {
            renderHistory(result.logs);
        } else {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Error: ${result.message}</div>`;
        }
    } catch (e) {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Error de conexión</div>`;
    }
}

function renderHistory(logs) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (!logs || logs.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">No hay registros recientes.</div>';
        return;
    }

    logs.forEach(log => {
        let dateStr = log.date;
        try {
            const d = new Date(log.date);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) { }

        const card = document.createElement('div');
        card.style.background = 'var(--glass-bg)';
        card.style.border = '1px solid var(--glass-border)';
        card.style.borderRadius = '12px';
        card.style.padding = '12px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '5px';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-light);">
                <span>${dateStr}</span>
                <span style="font-weight:bold; color:var(--primary);">${log.worker}</span>
            </div>
            <div style="font-size:1rem; font-weight:500;">
                ${log.task}
            </div>
            <div style="font-size:0.75rem; color:var(--text-light); text-align:right;">
                ID: ${log.id}
            </div>
        `;
        list.appendChild(card);
    });
}

async function exportPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast("Librería PDF no cargada", "error");
        return;
    }

    const doc = new jsPDF();
    const logs = document.querySelectorAll('#history-list > div');

    if (logs.length === 0) {
        showToast("No hay datos para exportar", "warning");
        return;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Reporte Bitácora Mantención Rahue", 105, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 22, { align: "center" });

    let y = 35;

    Array.from(logs).forEach((card, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        const dateWorker = card.children[0].innerText.split('\n').join(' - ');
        const task = card.children[1].innerText.trim();
        const id = card.children[2].innerText.trim();

        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.rect(10, y - 5, 190, 20, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(dateWorker, 12, y);

        doc.setFont("helvetica", "normal");
        doc.text(task, 12, y + 6);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(id, 195, y, { align: "right" });
        doc.setTextColor(0);

        y += 25;
    });

    doc.save("bitacora_mantencion_rahue.pdf");
    showToast("PDF Descargado", "success");
}
