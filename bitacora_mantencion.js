/**
 * CONFIGURATION
 */
const CONFIG = {
    // PEGA AQUÍ EL LINK INDEPENDIENTE DE LA APP SCRIPT PARA EL CENTRO RAHUE
    API_URL: 'https://script.google.com/macros/s/AKfycbyr7rw4orxhBhbaJ6z9kdPZeOMV8M8O6qOmsdJDR1D30SWrFXjfAH4QIj9qO9ehbtDf/exec',
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

    // Show install button immediately if app is NOT running in standalone mode (installed PWA)
    if (!window.matchMedia('(display-mode: standalone)').matches && window.navigator.standalone !== true) {
        const installBtn = document.getElementById('btn-install-pwa');
        if (installBtn) installBtn.style.display = 'flex';
    } else {
        const installBtn = document.getElementById('btn-install-pwa');
        if (installBtn) installBtn.style.display = 'none';
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
    let fecha = fechaInput ? fechaInput.value : '';

    // Anexar la hora exacta del dispositivo a la fecha seleccionada
    if (fecha) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        fecha = `${fecha}T${hh}:${min}:${sec}`;
    }
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

    const payload = {
        action: 'MAINTENANCE_LOG',
        worker: worker,
        fecha_trabajo: fecha,
        tasks: taskBatch
    };

    // --- MANEJO OFFLINE PRIMER CONTROL ---
    if (!navigator.onLine) {
        saveToOfflineQueue(payload);
        showToast("Sin conexión. Reporte guardado para enviar luego en caché local.", "warning");
        taskBatch = [];
        renderTaskBatch();
        resetSubmitBtn(submitBtn);
        return;
    }

    try {
        const result = await sendTransaction(payload);

        if (result.status === 'success') {
            showToast("Reporte enviado exitosamente", "success");
            taskBatch = [];
            renderTaskBatch();
            // Process queue just in case there are stuck items
            processOfflineQueue();
        } else {
            showToast("Error del Servidor: " + (result.message || "Desconocido"), "error");
        }
    } catch (e) {
        // Fallback robusto si fetch falla (ej: mala red pero JS cree que onLine = true)
        saveToOfflineQueue(payload);
        showToast("Sin internet al servidor. Reporte directo a cola offline.", "warning");
        taskBatch = [];
        renderTaskBatch();
    } finally {
        resetSubmitBtn(submitBtn);
    }
}

function resetSubmitBtn(submitBtn) {
    isSubmitting = false;
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-icons-round">send</span> Enviar Reporte';
    }
}

/**
 * HISTORY & EXPORT LOGIC
 */

function openSheet() {
    // PEGA AQUÍ EL LINK DE TU NUEVA HOJA DE GOOGLE SHEETS PARA RAHUE
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1ahgD4zXAl86JvT5F0PQIfUIzvX54L1ZFgrAacd-lcAw/edit?usp=sharing';

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

    // Si estás offline, mostramos un resumen local en vez de conectar al servidor
    if (!navigator.onLine) {
        const qs = getOfflineQueue();
        if (qs.length > 0) {
            list.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-light); font-size: 0.8rem;">Estás offline. Tienes ${qs.length} reportes en cola local listos para enviarse al reconectar.</div>`;
            renderHistory(qs.map((p, i) => {
                let displayDate = p.fecha_trabajo || new Date().toISOString();
                // Limpiar la 'T' para mostrarla más bonita offline si es que la trae
                displayDate = displayDate.replace('T', ' ');
                return {
                    id: `COLA-${i + 1}`,
                    date: displayDate,
                    worker: p.worker,
                    task: p.tasks.join(', ')
                };
            }));
        } else {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">Estás offline. No hay registros pendientes en cola.</div>';
        }
        return;
    }

    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">Cargando...</div>';

    try {
        const result = await sendTransaction({ action: 'GET_LOGS' });

        if (result.status === 'success') {
            renderHistory(result.logs);
        } else {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Error: ${result.message}</div>`;
        }
    } catch (e) {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Error de conexión intentelo de nuevo</div>`;
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
            // Reemplazar la T por espacio o formatearla bonito si es válido
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

/**
 * OFFLINE QUEUE LOGIC
 */
const OFFLINE_QUEUE_KEY = 'maint_offline_queue_rahue';

function getOfflineQueue() {
    const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return q ? JSON.parse(q) : [];
}

function saveToOfflineQueue(payload) {
    const q = getOfflineQueue();
    q.push(payload);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
    updateOfflineBadge();
}

function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    updateOfflineBadge();
}

async function processOfflineQueue() {
    if (!navigator.onLine) return;
    const q = getOfflineQueue();
    if (q.length === 0) return;

    showToast(`Sincronizando ${q.length} registros en cola local...`, 'info');

    // Process queue sequentially
    const remaining = [];
    for (const payload of q) {
        try {
            const result = await sendTransaction(payload);
            if (!result || result.status !== 'success') {
                remaining.push(payload);
            }
        } catch (e) {
            remaining.push(payload); // Network failed again
        }
    }

    if (remaining.length < q.length) {
        showToast(`Se sincronizaron ${q.length - remaining.length} reporte(s) al servidor`, 'success');
    }

    if (remaining.length === 0) {
        clearOfflineQueue();
    } else {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
        updateOfflineBadge();
    }
}

function updateOfflineBadge() {
    const q = getOfflineQueue();
    let badge = document.getElementById('offline-badge-rahue');
    if (q.length > 0) {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'offline-badge-rahue';
            badge.style.position = 'fixed';
            badge.style.bottom = '20px';
            badge.style.left = '50%';
            badge.style.transform = 'translateX(-50%)';
            badge.style.background = '#f59e0b';
            badge.style.color = '#fff';
            badge.style.padding = '8px 18px';
            badge.style.borderRadius = '30px';
            badge.style.fontSize = '0.8rem';
            badge.style.fontWeight = '600';
            badge.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
            badge.style.zIndex = '9999';
            badge.style.pointerEvents = 'none';
            document.body.appendChild(badge);
        }
        badge.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:6px;">cloud_off</span>${q.length} pend. sin conexión`;
    } else if (badge) {
        badge.remove();
    }
}

// Global Online reconnexion listener
window.addEventListener('online', () => {
    showToast("Conexión a internet restaurada", "success");
    processOfflineQueue();
});

// Check on boot
document.addEventListener('DOMContentLoaded', () => {
    updateOfflineBadge();
    setTimeout(processOfflineQueue, 1500); // Check 1.5 seconds after loading
});

/**
 * PWA INSTALLATION LOGIC
 */
let deferredPrompt;

// Escuchar evento para capturar prompt de instalación
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Solo mostrar el botón si NO estamos en standalone
    if (!window.matchMedia('(display-mode: standalone)').matches && window.navigator.standalone !== true) {
        const installBtn = document.getElementById('btn-install-pwa');
        if (installBtn) {
            installBtn.style.display = 'flex';
        }
    }
});

// Función lanzada por el clic en el botón
async function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('El usuario aceptó instalar la PWA');
            const installBtn = document.getElementById('btn-install-pwa');
            if (installBtn) installBtn.style.display = 'none'; // ocultar tras instalar
        } else {
            console.log('El usuario rechazó instalar la PWA');
        }
        deferredPrompt = null;
    } else {
        showToast("Toca Compartir / Menú en tu navegador y elige 'Agregar a inicio' para instalar.", "info");
    }
}

// Ocultar si se instala exitosamente mediante otro medio (ej: barra del navegador)
window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA was installed');
});
