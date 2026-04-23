const studentId = localStorage.getItem('studentId');

if (!studentId) {
  window.location.href = '/';
}

const socket = io();
let appState = null;
let timerInterval = null;

const studentNameEl = document.getElementById('student-name');
const studentSessionEl = document.getElementById('student-session');
const statusPillEl = document.getElementById('status-pill');
const studentGradeEl = document.getElementById('student-grade');
const groupGradeEl = document.getElementById('group-grade');
const timerEl = document.getElementById('timer');
const waitingCardEl = document.getElementById('waiting-card');
const questionCardEl = document.getElementById('question-card');
const pausedCardEl = document.getElementById('paused-card');
const finishedCardEl = document.getElementById('finished-card');
const questionNumberEl = document.getElementById('question-number');
const questionPromptEl = document.getElementById('question-prompt');
const optionsEl = document.getElementById('options');
const answerFormEl = document.getElementById('answer-form');
const submitAnswerEl = document.getElementById('submit-answer');
const answerMessageEl = document.getElementById('answer-message');
const answeredBadgeEl = document.getElementById('answered-badge');
const finalScoreTextEl = document.getElementById('final-score-text');
const pdfLinkEl = document.getElementById('pdf-link');

socket.emit('student:join', { studentId });
socket.on('session:changed', () => loadState());
socket.on('join:error', () => {
  localStorage.removeItem('studentId');
  window.location.href = '/';
});

answerFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!appState || !appState.currentQuestion || appState.hasAnsweredCurrent) {
    return;
  }

  const selected = document.querySelector('input[name="selectedOption"]:checked');
  if (!selected) {
    answerMessageEl.textContent = 'Selecciona una opción antes de enviar.';
    return;
  }

  submitAnswerEl.disabled = true;
  answerMessageEl.textContent = 'Enviando respuesta...';

  try {
    const response = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        questionIndex: appState.currentQuestion.index,
        selectedOption: Number(selected.value)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No fue posible guardar la respuesta.');
    }
    answerMessageEl.textContent = 'Respuesta enviada. Espera la siguiente pregunta.';
    await loadState();
  } catch (err) {
    answerMessageEl.textContent = err.message;
    submitAnswerEl.disabled = false;
  }
});

async function loadState() {
  try {
    const response = await fetch(`/api/state?studentId=${encodeURIComponent(studentId)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No fue posible cargar el estado.');
    }
    appState = data;
    render();
  } catch (err) {
    answerMessageEl.textContent = err.message;
  }
}

function render() {
  if (!appState) {
    return;
  }

  const { student, session, currentQuestion, visibleScore, finalScore, group, hasAnsweredCurrent } = appState;

  studentNameEl.textContent = student.name;
  studentSessionEl.textContent = `${session.title} · Pregunta ${Math.min(session.currentQuestionIndex + 1, session.totalQuestions)} de ${session.totalQuestions}`;
  statusPillEl.textContent = labelForStatus(session.status);
  statusPillEl.className = `status ${session.status}`;
  studentGradeEl.textContent = `${visibleScore.grade} / 10`;
  groupGradeEl.textContent = `${group.averageGrade} / 10`;
  pdfLinkEl.href = `/api/export/pdf/${encodeURIComponent(student.id)}`;

  waitingCardEl.classList.toggle('hidden', session.status !== 'waiting');
  questionCardEl.classList.toggle('hidden', session.status !== 'running');
  pausedCardEl.classList.toggle('hidden', session.status !== 'paused');
  finishedCardEl.classList.toggle('hidden', session.status !== 'finished');

  if (session.status === 'running' && currentQuestion) {
    questionNumberEl.textContent = `Pregunta ${currentQuestion.index + 1} de ${currentQuestion.total}`;
    questionPromptEl.textContent = currentQuestion.prompt;
    renderOptions(currentQuestion.options, hasAnsweredCurrent);
    answeredBadgeEl.textContent = hasAnsweredCurrent ? 'Respuesta enviada' : 'Sin responder';
    answerMessageEl.textContent = hasAnsweredCurrent ? 'Tu respuesta ya quedó registrada. Espera la siguiente pregunta.' : '';
    submitAnswerEl.disabled = hasAnsweredCurrent;
  }

  if (session.status === 'finished') {
    finalScoreTextEl.textContent = `${student.name}, obtuviste ${finalScore.correctCount} aciertos de ${session.totalQuestions} y una calificación final de ${finalScore.grade} / 10.`;
  }

  restartTimer();
}

function renderOptions(options, disabled) {
  optionsEl.innerHTML = '';
  options.forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'selectedOption';
    radio.value = String(index);
    radio.disabled = disabled;

    const textWrap = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = String.fromCharCode(65 + index) + ')';
    const text = document.createElement('div');
    text.textContent = option;

    textWrap.appendChild(strong);
    textWrap.appendChild(text);
    label.appendChild(radio);
    label.appendChild(textWrap);
    optionsEl.appendChild(label);
  });
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
  if (!appState) {
    timerEl.textContent = '--:--';
    return;
  }

  const { session } = appState;
  if (session.status === 'paused') {
    timerEl.textContent = formatMs(session.remainingMs);
    return;
  }

  if (session.status !== 'running') {
    timerEl.textContent = '--:--';
    return;
  }

  const deadline = (session.questionStartedAt || Date.now()) + (session.remainingMs || 0);
  const remaining = Math.max(0, deadline - Date.now());
  timerEl.textContent = formatMs(remaining);

  if (remaining === 0 && !appState.hasAnsweredCurrent) {
    submitAnswerEl.disabled = true;
    answerMessageEl.textContent = 'Tiempo agotado. Espera la siguiente pregunta.';
  }
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

loadState();
