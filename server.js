const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { Server } = require('socket.io');
const questions = require('./data/questions');

const PORT = parseInt(process.env.PORT || '3000', 10);
const TEACHER_PIN = process.env.TEACHER_PIN || '1234';
const QUESTION_DURATION_SECONDS = parseInt(process.env.QUESTION_DURATION_SECONDS || '60', 10);
const QUESTION_DURATION_MS = QUESTION_DURATION_SECONDS * 1000;
const AUTO_ADVANCE_WHEN_ALL_ANSWERED = process.env.AUTO_ADVANCE_WHEN_ALL_ANSWERED !== 'false';
const SHOW_LIVE_SCORE_DURING_QUESTION = process.env.SHOW_LIVE_SCORE_DURING_QUESTION === 'true';
const DB_PATH = path.join(__dirname, 'exam-db.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let questionTimer = null;
let autoAdvanceTimer = null;

function defaultStore() {
  return {
    settings: {},
    sessions: [],
    students: [],
    responses: []
  };
}

function loadStore() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = defaultStore();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      settings: parsed.settings || {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      students: Array.isArray(parsed.students) ? parsed.students : [],
      responses: Array.isArray(parsed.responses) ? parsed.responses : []
    };
  } catch (error) {
    console.error('No fue posible leer la base JSON. Se reinicia el archivo.', error);
    const initial = defaultStore();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

let store = loadStore();

function saveStore() {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function roundGrade(value) {
  return Math.round(value * 100) / 100;
}

function setSetting(key, value) {
  store.settings[key] = value;
  saveStore();
}

function getSetting(key) {
  return store.settings[key] || null;
}

function getSessionById(id) {
  return store.sessions.find((session) => session.id === id) || null;
}

function getStudentById(id) {
  return store.students.find((student) => student.id === id) || null;
}

function listStudentsBySession(sessionId) {
  return store.students
    .filter((student) => student.session_id === sessionId)
    .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
}

function listResponsesBySession(sessionId) {
  return store.responses.filter((response) => response.session_id === sessionId);
}

function createSession(title = 'Examen sincronizado de Python') {
  const timestamp = nowIso();
  const session = {
    id: crypto.randomUUID(),
    title,
    status: 'waiting',
    current_question_index: 0,
    question_started_at: null,
    question_remaining_ms: QUESTION_DURATION_MS,
    question_duration_ms: QUESTION_DURATION_MS,
    started_at: null,
    ended_at: null,
    created_at: timestamp,
    updated_at: timestamp
  };
  store.sessions.push(session);
  setSetting('active_session_id', session.id);
  return session;
}

function getActiveSession() {
  const activeId = getSetting('active_session_id');
  if (!activeId) {
    return createSession();
  }
  const session = getSessionById(activeId);
  return session || createSession();
}

function updateSession(sessionId, fields) {
  const session = getSessionById(sessionId);
  if (!session) {
    return null;
  }
  Object.assign(session, fields, { updated_at: nowIso() });
  saveStore();
  return session;
}

function upsertStudent(student) {
  store.students.push(student);
  saveStore();
  return student;
}

function insertResponse(response) {
  store.responses.push(response);
  saveStore();
  return response;
}

function clearTimers() {
  if (questionTimer) {
    clearTimeout(questionTimer);
    questionTimer = null;
  }
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
}

function getRemainingMs(session) {
  if (!session.question_started_at || !session.question_remaining_ms) {
    return session.question_duration_ms || QUESTION_DURATION_MS;
  }
  const elapsed = Date.now() - session.question_started_at;
  return Math.max(0, session.question_remaining_ms - elapsed);
}

function visibleQuestionCutoff(session) {
  if (session.status === 'waiting') {
    return 0;
  }
  if (session.status === 'finished') {
    return questions.length;
  }
  if (SHOW_LIVE_SCORE_DURING_QUESTION) {
    return Math.min(questions.length, session.current_question_index + 1);
  }
  return session.current_question_index;
}

function buildScoreSummary(studentId, sessionId, cutoff) {
  const relevant = store.responses.filter(
    (response) => response.session_id === sessionId && response.student_id === studentId && response.question_index < cutoff
  );
  const correctCount = relevant.filter((response) => response.is_correct === 1).length;
  const answeredCount = relevant.length;
  const grade = roundGrade((correctCount / questions.length) * 10);
  return { correctCount, answeredCount, grade };
}

function buildGroupSummary(sessionId, cutoff) {
  const students = listStudentsBySession(sessionId);
  if (!students.length) {
    return { totalStudents: 0, averageCorrect: 0, averageGrade: 0 };
  }

  const correctTotals = students.map((student) => buildScoreSummary(student.id, sessionId, cutoff).correctCount);
  const averageCorrect = correctTotals.reduce((sum, value) => sum + value, 0) / students.length;
  return {
    totalStudents: students.length,
    averageCorrect: roundGrade(averageCorrect),
    averageGrade: roundGrade((averageCorrect / questions.length) * 10)
  };
}

function getCurrentQuestionStats(sessionId, questionIndex) {
  if (questionIndex == null || questionIndex < 0 || questionIndex >= questions.length) {
    return { answeredCount: 0, correctCount: 0, answerDistribution: [0, 0, 0, 0] };
  }

  const responses = store.responses.filter(
    (response) => response.session_id === sessionId && response.question_index === questionIndex
  );

  const answerDistribution = [0, 0, 0, 0];
  responses.forEach((response) => {
    if (response.selected_option >= 0 && response.selected_option < answerDistribution.length) {
      answerDistribution[response.selected_option] += 1;
    }
  });

  return {
    answeredCount: responses.length,
    correctCount: responses.filter((response) => response.is_correct === 1).length,
    answerDistribution
  };
}

function sessionQuestionPayload(session) {
  if (!['running', 'paused'].includes(session.status)) {
    return null;
  }
  const question = questions[session.current_question_index];
  if (!question) {
    return null;
  }
  return {
    index: session.current_question_index,
    total: questions.length,
    prompt: question.prompt,
    options: question.options
  };
}

function buildStudentState(studentId) {
  const student = getStudentById(studentId);
  if (!student) {
    return null;
  }

  const session = getSessionById(student.session_id);
  if (!session) {
    return null;
  }

  const visibleCutoff = visibleQuestionCutoff(session);
  const visibleScore = buildScoreSummary(student.id, session.id, visibleCutoff);
  const finalScore = buildScoreSummary(student.id, session.id, questions.length);
  const group = buildGroupSummary(session.id, visibleCutoff);
  const currentQuestion = sessionQuestionPayload(session);
  const hasAnsweredCurrent = currentQuestion
    ? store.responses.some(
        (response) =>
          response.session_id === session.id &&
          response.student_id === student.id &&
          response.question_index === session.current_question_index
      )
    : false;

  return {
    student: {
      id: student.id,
      name: student.name
    },
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      currentQuestionIndex: session.current_question_index,
      totalQuestions: questions.length,
      questionDurationSeconds: Math.round((session.question_duration_ms || QUESTION_DURATION_MS) / 1000),
      questionStartedAt: session.question_started_at,
      remainingMs: ['running', 'paused'].includes(session.status) ? getRemainingMs(session) : 0,
      startedAt: session.started_at,
      endedAt: session.ended_at
    },
    currentQuestion,
    hasAnsweredCurrent,
    visibleScore,
    finalScore,
    group
  };
}

function buildTeacherOverview() {
  const session = getActiveSession();
  const visibleCutoff = visibleQuestionCutoff(session);
  const group = buildGroupSummary(session.id, visibleCutoff);
  const currentQuestion = sessionQuestionPayload(session);
  const currentQuestionStats = getCurrentQuestionStats(session.id, session.current_question_index);
  const students = listStudentsBySession(session.id).map((student) => {
    const visibleScore = buildScoreSummary(student.id, session.id, visibleCutoff);
    const finalScore = buildScoreSummary(student.id, session.id, questions.length);
    const answeredCurrent = store.responses.some(
      (response) =>
        response.session_id === session.id &&
        response.student_id === student.id &&
        response.question_index === session.current_question_index
    );

    return {
      id: student.id,
      name: student.name,
      visibleScore,
      finalScore,
      answeredCurrent
    };
  });

  return {
    config: {
      questionDurationSeconds: QUESTION_DURATION_SECONDS,
      autoAdvanceWhenAllAnswered: AUTO_ADVANCE_WHEN_ALL_ANSWERED,
      showLiveScoreDuringQuestion: SHOW_LIVE_SCORE_DURING_QUESTION
    },
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      currentQuestionIndex: session.current_question_index,
      totalQuestions: questions.length,
      questionStartedAt: session.question_started_at,
      remainingMs: ['running', 'paused'].includes(session.status) ? getRemainingMs(session) : 0,
      startedAt: session.started_at,
      endedAt: session.ended_at
    },
    group,
    currentQuestion,
    currentQuestionStats,
    students
  };
}

function allStudentsAnsweredCurrentQuestion(session) {
  const students = listStudentsBySession(session.id);
  if (!students.length) {
    return false;
  }
  const answeredCount = store.responses.filter(
    (response) => response.session_id === session.id && response.question_index === session.current_question_index
  ).length;
  return answeredCount >= students.length;
}

function broadcast(sessionId) {
  io.to(`session:${sessionId}`).emit('session:changed');
  io.to('teachers').emit('teacher:changed');
}

function finishSession(sessionId) {
  clearTimers();
  const session = getSessionById(sessionId);
  if (!session || session.status === 'finished') {
    return;
  }
  updateSession(sessionId, {
    status: 'finished',
    question_started_at: null,
    question_remaining_ms: 0,
    ended_at: nowIso()
  });
  broadcast(sessionId);
}

function advanceToNextQuestion(sessionId) {
  clearTimers();
  const session = getSessionById(sessionId);
  if (!session) {
    return;
  }
  if (session.current_question_index >= questions.length - 1) {
    finishSession(sessionId);
    return;
  }

  updateSession(sessionId, {
    status: 'running',
    current_question_index: session.current_question_index + 1,
    question_started_at: Date.now(),
    question_remaining_ms: QUESTION_DURATION_MS
  });

  scheduleQuestionTimer();
  broadcast(sessionId);
}

function scheduleAutoAdvanceIfNeeded() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  const session = getActiveSession();
  if (!AUTO_ADVANCE_WHEN_ALL_ANSWERED || session.status !== 'running') {
    return;
  }
  if (!allStudentsAnsweredCurrentQuestion(session)) {
    return;
  }

  autoAdvanceTimer = setTimeout(() => {
    const freshSession = getActiveSession();
    if (freshSession.id === session.id && freshSession.status === 'running' && allStudentsAnsweredCurrentQuestion(freshSession)) {
      advanceToNextQuestion(freshSession.id);
    }
  }, 1500);
}

function scheduleQuestionTimer() {
  if (questionTimer) {
    clearTimeout(questionTimer);
    questionTimer = null;
  }

  const session = getActiveSession();
  if (session.status !== 'running') {
    return;
  }

  const remainingMs = getRemainingMs(session);
  questionTimer = setTimeout(() => {
    const freshSession = getActiveSession();
    if (freshSession.status === 'running') {
      advanceToNextQuestion(freshSession.id);
    }
  }, Math.max(remainingMs, 1));
}

function requireTeacher(req, res, next) {
  const pin = req.get('x-teacher-pin') || (req.body && req.body.pin) || req.query.pin;
  if (pin !== TEACHER_PIN) {
    return res.status(401).json({ error: 'PIN de profesor no válido.' });
  }
  next();
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function slugify(text) {
  return String(text || 'alumno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'alumno';
}

app.get('/api/questions/count', (_req, res) => {
  res.json({ totalQuestions: questions.length, durationSeconds: QUESTION_DURATION_SECONDS });
});

app.post('/api/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) {
    return res.status(400).json({ error: 'Escribe un nombre válido.' });
  }

  const session = getActiveSession();
  const student = {
    id: crypto.randomUUID(),
    session_id: session.id,
    name,
    joined_at: nowIso()
  };
  upsertStudent(student);
  broadcast(session.id);

  res.json({
    studentId: student.id,
    sessionId: session.id,
    sessionTitle: session.title,
    sessionStatus: session.status
  });
});

app.get('/api/state', (req, res) => {
  const studentId = String(req.query.studentId || '').trim();
  const state = buildStudentState(studentId);
  if (!state) {
    return res.status(404).json({ error: 'Alumno no encontrado.' });
  }
  res.json(state);
});

app.post('/api/answer', (req, res) => {
  const studentId = String(req.body.studentId || '').trim();
  const questionIndex = Number(req.body.questionIndex);
  const selectedOption = Number(req.body.selectedOption);

  if (!Number.isInteger(questionIndex) || !Number.isInteger(selectedOption)) {
    return res.status(400).json({ error: 'Respuesta inválida.' });
  }

  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ error: 'Alumno no encontrado.' });
  }

  const session = getSessionById(student.session_id);
  if (!session || session.status !== 'running') {
    return res.status(400).json({ error: 'El examen no está en ejecución.' });
  }

  if (questionIndex !== session.current_question_index) {
    return res.status(409).json({ error: 'La pregunta actual ya cambió.' });
  }

  if (selectedOption < 0 || selectedOption >= questions[questionIndex].options.length) {
    return res.status(400).json({ error: 'Opción fuera de rango.' });
  }

  const alreadyAnswered = store.responses.some(
    (response) =>
      response.session_id === session.id &&
      response.student_id === student.id &&
      response.question_index === questionIndex
  );
  if (alreadyAnswered) {
    return res.status(409).json({ error: 'Ya contestaste esta pregunta.' });
  }

  insertResponse({
    id: crypto.randomUUID(),
    session_id: session.id,
    student_id: student.id,
    question_index: questionIndex,
    selected_option: selectedOption,
    is_correct: selectedOption === questions[questionIndex].correctIndex ? 1 : 0,
    answered_at: nowIso()
  });

  broadcast(session.id);
  scheduleAutoAdvanceIfNeeded();
  res.json({ ok: true });
});

app.get('/api/teacher/overview', requireTeacher, (_req, res) => {
  res.json(buildTeacherOverview());
});

app.post('/api/teacher/start', requireTeacher, (_req, res) => {
  const session = getActiveSession();
  if (session.status === 'finished') {
    return res.status(400).json({ error: 'La sesión terminó. Usa reiniciar para abrir un nuevo examen.' });
  }

  let updated;
  if (session.status === 'paused') {
    updated = updateSession(session.id, {
      status: 'running',
      question_started_at: Date.now()
    });
  } else {
    updated = updateSession(session.id, {
      status: 'running',
      current_question_index: session.current_question_index || 0,
      question_started_at: Date.now(),
      question_remaining_ms: session.question_remaining_ms || QUESTION_DURATION_MS,
      started_at: session.started_at || nowIso(),
      ended_at: null
    });
  }

  scheduleQuestionTimer();
  broadcast(updated.id);
  res.json({ ok: true, session: updated });
});

app.post('/api/teacher/pause', requireTeacher, (_req, res) => {
  const session = getActiveSession();
  if (session.status !== 'running') {
    return res.status(400).json({ error: 'La sesión no está corriendo.' });
  }

  const remainingMs = getRemainingMs(session);
  clearTimers();
  const updated = updateSession(session.id, {
    status: 'paused',
    question_started_at: null,
    question_remaining_ms: remainingMs
  });
  broadcast(updated.id);
  res.json({ ok: true, session: updated });
});

app.post('/api/teacher/next', requireTeacher, (_req, res) => {
  const session = getActiveSession();
  if (!['running', 'paused'].includes(session.status)) {
    return res.status(400).json({ error: 'No hay una sesión activa para avanzar.' });
  }

  advanceToNextQuestion(session.id);
  res.json({ ok: true });
});

app.post('/api/teacher/reset', requireTeacher, (_req, res) => {
  clearTimers();
  const session = createSession();
  broadcast(session.id);
  res.json({ ok: true, session });
});

app.get('/api/export/csv', requireTeacher, (_req, res) => {
  const session = getActiveSession();
  const students = listStudentsBySession(session.id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const headers = ['estudiante'];
  for (let i = 0; i < questions.length; i += 1) {
    headers.push(`P${i + 1}`);
  }
  headers.push('aciertos_totales', 'calificacion_final');

  const lines = [headers.join(',')];
  students.forEach((student) => {
    const cols = [csvEscape(student.name)];
    let correctCount = 0;
    for (let i = 0; i < questions.length; i += 1) {
      const response = store.responses.find(
        (item) => item.session_id === session.id && item.student_id === student.id && item.question_index === i
      );
      const value = response && response.is_correct === 1 ? 1 : 0;
      if (value === 1) {
        correctCount += 1;
      }
      cols.push(String(value));
    }
    cols.push(String(correctCount));
    cols.push(String(roundGrade((correctCount / questions.length) * 10)));
    lines.push(cols.join(','));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="resultados-${session.id}.csv"`);
  res.send(lines.join('\n'));
});

app.get('/api/export/pdf/:studentId', (req, res) => {
  const studentId = String(req.params.studentId || '').trim();
  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ error: 'Alumno no encontrado.' });
  }

  const session = getSessionById(student.session_id);
  if (!session || session.status !== 'finished') {
    return res.status(400).json({ error: 'El PDF se genera al finalizar el examen.' });
  }

  const finalScore = buildScoreSummary(student.id, session.id, questions.length);
  const studentResponses = store.responses
    .filter((response) => response.session_id === session.id && response.student_id === student.id)
    .sort((a, b) => a.question_index - b.question_index);
  const responseMap = new Map(studentResponses.map((response) => [response.question_index, response]));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="resultado-${slugify(student.name)}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('Resultado del examen sincronizado de Python', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Alumno: ${student.name}`);
  doc.text(`Sesión: ${session.title}`);
  doc.text(`Fecha de inicio: ${session.started_at || 'No registrada'}`);
  doc.text(`Fecha de cierre: ${session.ended_at || 'No registrada'}`);
  doc.text(`Aciertos: ${finalScore.correctCount} de ${questions.length}`);
  doc.text(`Calificación final: ${finalScore.grade} / 10`);
  doc.moveDown();
  doc.fontSize(13).text('Detalle por pregunta', { underline: true });
  doc.moveDown(0.5);

  questions.forEach((question, index) => {
    const response = responseMap.get(index);
    const selectedText = response ? question.options[response.selected_option] : 'Sin respuesta';
    const correctText = question.options[question.correctIndex];
    const resultText = response && response.is_correct === 1 ? 'Correcta' : 'Incorrecta';

    if (doc.y > 700) {
      doc.addPage();
    }

    doc.fontSize(11).text(`${index + 1}. ${question.prompt}`);
    doc.fontSize(10).text(`Tu respuesta: ${selectedText}`);
    doc.text(`Respuesta correcta: ${correctText}`);
    doc.text(`Resultado: ${resultText}`);
    doc.moveDown(0.5);
  });

  doc.end();
});

app.get('/teacher', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

app.get('/student', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('student:join', ({ studentId }) => {
    const student = getStudentById(String(studentId || ''));
    if (!student) {
      socket.emit('join:error', { message: 'Alumno no encontrado.' });
      return;
    }
    socket.join(`session:${student.session_id}`);
    socket.emit('join:ok', { role: 'student' });
  });

  socket.on('teacher:join', ({ pin }) => {
    if (pin !== TEACHER_PIN) {
      socket.emit('join:error', { message: 'PIN inválido.' });
      return;
    }
    socket.join('teachers');
    socket.emit('join:ok', { role: 'teacher' });
  });
});

(function initialize() {
  const session = getActiveSession();
  if (session.status === 'running') {
    scheduleQuestionTimer();
  }
})();

server.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  console.log(`PIN de profesor: ${TEACHER_PIN}`);
});
