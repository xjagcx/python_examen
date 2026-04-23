const socket = io();
let teacherState = null;
let timerInterval = null;

const teacherPinEl = document.getElementById('teacher-pin');
const savePinEl = document.getElementById('save-pin');
const teacherMessageEl = document.getElementById('teacher-message');
const sessionMetaEl = document.getElementById('session-meta');
const teacherStatusEl = document.getElementById('teacher-status');
const metricStudentsEl = document.getElementById('metric-students');
const metricAverageEl = document.getElementById('metric-average');
const metricTimerEl = document.getElementById('metric-timer');
const btnStartEl = document.getElementById('btn-start');
const btnPauseEl = document.getElementById('btn-pause');
const btnNextEl = document.getElementById('btn-next');
const btnResetEl = document.getElementById('btn-reset');
const btnCsvEl = document.getElementById('btn-csv');
const currentQuestionLabelEl = document.getElementById('current-question-label');
const currentQuestionBoxEl = document.getElementById('current-question-box');
const currentQuestionTextEl = document.getElementById('current-question-text');
const metricAnsweredEl = document.getElementById('metric-answered');
const metricCorrectEl = document.getElementById('metric-correct');
const metricAutoadvanceEl = document.getElementById('metric-autoadvance');
const studentsBodyEl = document.getElementById('students-body');
const configListEl = document.getElementById('config-list');

teacherPinEl.value = localStorage.getItem('teacherPin') || '1234';
joinTeacherRoom();

savePinEl.addEventListener('click', async () => {
  localStorage.setItem('teacherPin', teacherPinEl.value.trim());
  joinTeacherRoom();
  await loadOverview();
});

btnStartEl.addEventListener('click', () => performTeacherAction('/api/teacher/start', 'POST'));
btnPauseEl.addEventListener('click', () => performTeacherAction('/api/teacher/pause', 'POST'));
btnNextEl.addEventListener('click', () => performTeacherAction('/api/teacher/next', 'POST'));
btnResetEl.addEventListener('click', async () => {
  const ok = window.confirm('Esto crea una nueva sesión vacía. ¿Deseas continuar?');
  if (!ok) return;
  await performTeacherAction('/api/teacher/reset', 'POST');
});
btnCsvEl.addEventListener('click', downloadCsv);

socket.on('teacher:changed', () => loadOverview());
socket.on('join:error', (payload) => {
  teacherMessageEl.textContent = payload.message || 'No fue posible entrar al canal del profesor.';
});

function joinTeacherRoom() {
  teacherMessageEl.textContent = '';
  socket.emit('teacher:join', { pin: teacherPinEl.value.trim() });
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-teacher-pin': teacherPinEl.value.trim()
  };
}

async function performTeacherAction(url, method) {
  teacherMessageEl.textContent = '';
  try {
    const response = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No fue posible ejecutar la acción.');
    }
    await loadOverview();
  } catch (err) {
    teacherMessageEl.textContent = err.message;
  }
}

async function downloadCsv() {
  try {
    const response = await fetch('/api/export/csv', {
      headers: { 'x-teacher-pin': teacherPinEl.value.trim() }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'No fue posible generar el CSV.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resultados-examen.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    teacherMessageEl.textContent = err.message;
  }
}

async function loadOverview() {
  try {
    const response = await fetch('/api/teacher/overview', {
      headers: { 'x-teacher-pin': teacherPinEl.value.trim() }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No fue posible cargar el panel.');
    }
    teacherState = data;
    render();
  } catch (err) {
    teacherMessageEl.textContent = err.message;
  }
}

function render() {
  if (!teacherState) {
    return;
  }

  const { session, group, currentQuestion, currentQuestionStats, students, config } = teacherState;
  teacherStatusEl.textContent = labelForStatus(session.status);
  teacherStatusEl.className = `status ${session.status}`;
  sessionMetaEl.textContent = `${session.title} · ID ${session.id} · Pregunta ${Math.min(session.currentQuestionIndex + 1, session.totalQuestions)} de ${session.totalQuestions}`;
  metricStudentsEl.textContent = String(group.totalStudents);
  metricAverageEl.textContent = `${group.averageGrade} / 10`;
  metricAnsweredEl.textContent = `${currentQuestionStats.answeredCount}`;
  metricCorrectEl.textContent = `${currentQuestionStats.correctCount}`;
  metricAutoadvanceEl.textContent = config.autoAdvanceWhenAllAnswered ? 'Sí' : 'No';

  configListEl.innerHTML = `
    <li>Duración por pregunta: ${config.questionDurationSeconds} segundos</li>
    <li>Autoavance al responder todos: ${config.autoAdvanceWhenAllAnswered ? 'sí' : 'no'}</li>
    <li>Marcador visible durante pregunta abierta: ${config.showLiveScoreDuringQuestion ? 'sí' : 'no'}</li>
    <li>Calificación final: aciertos / 40 × 10</li>
  `;

  if (currentQuestion) {
    currentQuestionLabelEl.textContent = `Pregunta ${currentQuestion.index + 1} activa`;
    currentQuestionTextEl.textContent = currentQuestion.prompt;
    currentQuestionBoxEl.classList.remove('hidden');
  } else {
    currentQuestionLabelEl.textContent = session.status === 'finished' ? 'El examen concluyó.' : 'Aún no inicia.';
    currentQuestionBoxEl.classList.add('hidden');
    currentQuestionTextEl.textContent = '';
  }

  studentsBodyEl.innerHTML = '';
  if (!students.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6" class="muted">Aún no hay estudiantes registrados.</td>';
    studentsBodyEl.appendChild(row);
  } else {
    students.forEach((student) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(student.name)}</td>
        <td><span class="pill ${student.answeredCurrent ? 'ok' : 'pending'}">${student.answeredCurrent ? 'Contestada' : 'Pendiente'}</span></td>
        <td>${student.visibleScore.correctCount}</td>
        <td>${student.visibleScore.grade} / 10</td>
        <td>${student.finalScore.correctCount}</td>
        <td>${student.finalScore.grade} / 10</td>
      `;
      studentsBodyEl.appendChild(row);
    });
  }

  restartTimer();
}

function restartTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimer();
  timerInterval = setInterval(updateTimer, 250);
}

function updateTimer() {
  if (!teacherState) {
    metricTimerEl.textContent = '--:--';
    return;
  }

  const { session } = teacherState;
  if (session.status === 'paused') {
    metricTimerEl.textContent = formatMs(session.remainingMs);
    return;
  }
  if (session.status !== 'running') {
    metricTimerEl.textContent = '--:--';
    return;
  }
  const deadline = (session.questionStartedAt || Date.now()) + (session.remainingMs || 0);
  const remaining = Math.max(0, deadline - Date.now());
  metricTimerEl.textContent = formatMs(remaining);
}

function labelForStatus(status) {
  return {
    waiting: 'Esperando',
    running: 'En curso',
    paused: 'En pausa',
    finished: 'Finalizado'
  }[status] || status;
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

loadOverview();
