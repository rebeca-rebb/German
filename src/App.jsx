import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import verbs, { ALL_PREPOSITIONS } from "./data/verbs";

const QUESTIONS_PER_ROUND = 20;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blankOutPreposition(example, preposition) {
  const preps = preposition.split("/");
  let result = example;
  for (const p of preps) {
    // Use lookahead/lookbehind on spaces and punctuation instead of \b
    // because \b doesn't work with Unicode characters (ü, ö, ä)
    const regex = new RegExp(
      `(?<=^|[\\s,;:.!?])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s,;:.!?])`,
      "g"
    );
    result = result.replace(regex, "______");
  }
  return result;
}

function generateOptions(correctPrep) {
  const correctPreps = correctPrep.split("/");
  const wrong = shuffle(
    ALL_PREPOSITIONS.filter((p) => !correctPreps.includes(p))
  ).slice(0, 3);
  const display = correctPreps[0];
  return shuffle([display, ...wrong]);
}

function generateQuestions() {
  return shuffle(verbs).slice(0, QUESTIONS_PER_ROUND);
}

// --- Screens ---

function HomeScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🇩🇪</div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
          Verben mit Präpositionen
        </h1>
        <p className="text-text-muted mb-10 text-lg">
          Lerne deutsche Verben mit ihren Präpositionen
        </p>

        <div className="space-y-4">
          <button
            onClick={() => onStart("multiple")}
            className="w-full py-4 px-6 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-xl">🔘</span>
            <span className="ml-3">Alegere multiplă</span>
          </button>
          <button
            onClick={() => onStart("fill")}
            className="w-full py-4 px-6 bg-surface-3 hover:bg-surface-2 text-text font-semibold rounded-xl border border-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-xl">✍️</span>
            <span className="ml-3">Completare</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }) {
  const pct = (current / total) * 100;
  return (
    <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
      <div
        className="h-full bg-accent rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function QuizScreen({ mode, onFinish, onBack }) {
  const [questions] = useState(() => generateQuestions());
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | { correct, answer }
  const [input, setInput] = useState("");
  const [wrongVerbs, setWrongVerbs] = useState([]);
  const inputRef = useRef(null);

  const q = questions[current];
  const options = useMemo(
    () => (mode === "multiple" ? generateOptions(q.preposition) : []),
    [q, mode]
  );

  useEffect(() => {
    if (mode === "fill" && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [current, feedback, mode]);

  const checkAnswer = useCallback(
    (answer) => {
      if (feedback) return;
      const correctPreps = q.preposition.split("/");
      const isCorrect = correctPreps.includes(answer.trim().toLowerCase());

      if (isCorrect) {
        setScore((s) => s + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((b) => Math.max(b, newStreak));
      } else {
        setStreak(0);
        setWrongVerbs((w) => [...w, q]);
      }
      setFeedback({ correct: isCorrect, answer: q.preposition });
    },
    [feedback, q, streak]
  );

  const next = useCallback(() => {
    if (current + 1 >= QUESTIONS_PER_ROUND) {
      const finalScore = score + (feedback?.correct ? 0 : 0);
      onFinish({ score: finalScore, bestStreak, wrongVerbs, total: QUESTIONS_PER_ROUND });
    } else {
      setCurrent((c) => c + 1);
      setFeedback(null);
      setInput("");
    }
  }, [current, score, bestStreak, wrongVerbs, onFinish, feedback]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (feedback) {
        next();
      } else if (input.trim()) {
        checkAnswer(input);
      }
    }
  };

  const blankedExample = blankOutPreposition(q.example, q.preposition);

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text transition-colors cursor-pointer text-sm"
          >
            ← Înapoi
          </button>
          <span className="text-text-muted text-sm font-medium">
            {current + 1} / {QUESTIONS_PER_ROUND}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="text-sm font-bold animate-pulse">
              🔥 {streak}
            </span>
          )}
          <span className="text-sm font-semibold bg-surface-3 px-3 py-1 rounded-full">
            ✓ {score}
          </span>
        </div>
      </div>
      <ProgressBar current={current + 1} total={QUESTIONS_PER_ROUND} />

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-surface-2 rounded-2xl p-8 w-full border border-white/5 shadow-lg">
          <p className="text-text-muted text-sm mb-1 uppercase tracking-wider">
            Welche Präposition?
          </p>
          <h2 className="text-3xl font-bold mb-1">
            {q.verb}{" "}
            <span className="text-accent">___</span>
          </h2>
          <p className="text-xs text-text-muted mb-6">
            ({q.preposition.includes("/") ? "Akkusativ – mehrere möglich" : "Akkusativ"})
          </p>

          <div className="bg-surface/60 rounded-xl p-4 mb-8 border border-white/5">
            <p className="text-text-muted italic leading-relaxed">
              „{blankedExample}"
            </p>
          </div>

          {/* Answer area */}
          {mode === "multiple" ? (
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt) => {
                let btnClass =
                  "py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-200 cursor-pointer border ";
                if (!feedback) {
                  btnClass +=
                    "bg-surface-3 border-white/10 hover:bg-accent/20 hover:border-accent active:scale-95";
                } else {
                  const correctPreps = q.preposition.split("/");
                  if (correctPreps.includes(opt)) {
                    btnClass += "bg-correct/20 border-correct text-correct";
                  } else if (
                    !feedback.correct &&
                    opt === options.find((o) => !correctPreps.includes(o) && o === opt)
                  ) {
                    btnClass += "bg-surface-3 border-white/5 opacity-50";
                  } else {
                    btnClass += "bg-surface-3 border-white/5 opacity-50";
                  }
                }
                return (
                  <button
                    key={opt}
                    onClick={() => checkAnswer(opt)}
                    disabled={!!feedback}
                    className={btnClass}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!!feedback}
                placeholder="Präposition eingeben..."
                className="flex-1 bg-surface-3 border border-white/10 rounded-xl px-4 py-3 text-lg text-text placeholder-text-muted/50 outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => checkAnswer(input)}
                disabled={!!feedback || !input.trim()}
                className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Prüfen
              </button>
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-xl w-full text-center font-semibold text-lg ${
              feedback.correct
                ? "bg-correct/15 text-correct border border-correct/30"
                : "bg-wrong/15 text-wrong border border-wrong/30"
            }`}
          >
            {feedback.correct ? (
              "✓ Richtig!"
            ) : (
              <>
                ✗ Falsch — die richtige Antwort ist:{" "}
                <span className="font-bold">{feedback.answer}</span>
              </>
            )}
          </div>
        )}

        {feedback && (
          <button
            onClick={next}
            onKeyDown={(e) => e.key === "Enter" && next()}
            className="mt-4 px-8 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            autoFocus
          >
            {current + 1 >= QUESTIONS_PER_ROUND ? "Ergebnis anzeigen" : "Weiter →"}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ result, onRestart }) {
  const pct = Math.round((result.score / result.total) * 100);
  let emoji, message;
  if (pct === 100) { emoji = "🏆"; message = "Perfekt!"; }
  else if (pct >= 80) { emoji = "🎉"; message = "Sehr gut!"; }
  else if (pct >= 60) { emoji = "👍"; message = "Gut gemacht!"; }
  else if (pct >= 40) { emoji = "📚"; message = "Weiter üben!"; }
  else { emoji = "💪"; message = "Nicht aufgeben!"; }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-4">{emoji}</div>
        <h1 className="text-3xl font-bold mb-2">{message}</h1>

        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="bg-surface-2 rounded-xl p-4 border border-white/5">
            <p className="text-3xl font-bold text-accent">{result.score}</p>
            <p className="text-text-muted text-sm">Richtig</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 border border-white/5">
            <p className="text-3xl font-bold text-accent">{pct}%</p>
            <p className="text-text-muted text-sm">Prozent</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 border border-white/5">
            <p className="text-3xl font-bold text-accent">🔥 {result.bestStreak}</p>
            <p className="text-text-muted text-sm">Bester Streak</p>
          </div>
        </div>

        {result.wrongVerbs.length > 0 && (
          <div className="bg-surface-2 rounded-xl p-5 border border-white/5 text-left mb-8">
            <h3 className="font-semibold mb-3 text-wrong">
              Zur Wiederholung ({result.wrongVerbs.length}):
            </h3>
            <ul className="space-y-2">
              {result.wrongVerbs.map((v, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-surface-3/50 rounded-lg text-sm"
                >
                  <span className="font-medium">{v.verb}</span>
                  <span className="text-accent font-bold">{v.preposition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onRestart}
          className="w-full py-4 px-6 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Nochmal spielen
        </button>
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState("home"); // home | quiz | result
  const [mode, setMode] = useState(null);
  const [result, setResult] = useState(null);

  const startQuiz = (m) => {
    setMode(m);
    setScreen("quiz");
  };

  const finishQuiz = (r) => {
    setResult(r);
    setScreen("result");
  };

  const restart = () => {
    setScreen("home");
    setMode(null);
    setResult(null);
  };

  if (screen === "home") return <HomeScreen onStart={startQuiz} />;
  if (screen === "quiz")
    return <QuizScreen key={Date.now()} mode={mode} onFinish={finishQuiz} onBack={restart} />;
  if (screen === "result")
    return <ResultScreen result={result} onRestart={restart} />;
}

export default App;
