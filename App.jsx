import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import "pdfmake/build/vfs_fonts";

const PAIN_DESCRIPTORS = [
    { id: 1,  label: "Пульсирующая",         category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 2,  label: "Стреляющая",          category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 3,  label: "Режущая",          category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 4,  label: "Острая",             category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 5,  label: "Судорожная",          category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 6,  label: "Грызущая",           category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 7,  label: "Жгучая",       category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 8,  label: "Ноющая",            category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 9,  label: "Тяжелая",             category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 10, label: "Постоянная",            category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 11, label: "Раскалывающая",         category: "sensory", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 12, label: "Усталость от боли", category: "affective", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 13, label: "Тошнота от боли",         category: "affective", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 14, label: "Страх из-за боли",           category: "affective", texts: ["Нет","Слабая","Умеренная","Сильная"] },
    { id: 15, label: "Чувство наказания",   category: "affective", texts: ["Нет","Слабая","Умеренная","Сильная"] },
];

const PPI_OPTIONS = [
    { value: 0, label: "Нет боли" },
    { value: 1, label: "Легкая" },
    { value: 2, label: "Некомфортная" },
    { value: 3, label: "Напрягающая" },
    { value: 4, label: "Ужасная" },
    { value: 5, label: "Невыносимая" },
];

const LEVEL_CONFIG = [
    { label: "Нет",     color: "#22d3a5", bg: "rgba(34,211,165,0.12)", border: "rgba(34,211,165,0.4)" },
    { label: "Легкая",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" },
    { label: "Умеренная", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)" },
    { label: "Сильная",   color: "#ef4444", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.5)" },
];

const ACCORDION_SECTIONS = [
    { key: "about", title: "Об опроснике",
        body: <>Опросник SF-MPQ (Melzack, 1987) оценивает 15 характеристик боли по двум параметрам: сенсорной (Q1–11) и аффективной (Q12–15). Оценка дополняется визуальной аналоговой шкалой и вопросом об интенсивности боли в настоящий момент. Все баллы суммируются для получения суббаллов и общего результата. Более высокие баллы указывают на большую субъективную тяжесть боли.</> },
];

function DescriptorRow({ item, value, onChange }) {
    const cfg = LEVEL_CONFIG[value];
    return (
        <div className="descriptor-row" style={{ background: cfg.bg, borderColor: cfg.border }}>
            <span className="desc-num">{item.id}</span>
            <span className="desc-label" style={{ color: value > 0 ? cfg.color : undefined }}>{item.label}</span>
            <div className="desc-buttons">
                {[0,1,2,3].map(v => (
                    <button key={v} className="lvl-btn" onClick={() => onChange(v)}
                            style={value === v ? { background: LEVEL_CONFIG[v].bg, borderColor: LEVEL_CONFIG[v].border, color: LEVEL_CONFIG[v].color, fontWeight: 500 } : {}}>
                        {LEVEL_CONFIG[v].label}
                    </button>
                ))}
            </div>
            <span className="desc-badge">{item.texts[value]}</span>
        </div>
    );
}

function Admin() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const [authChecking, setAuthChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState(null);
    const [assessments, setAssessments] = useState([]);

    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const exportSelectedToPDF = () => {
        if (!selected || selected.error) return;

        const fullName = selected.full_name || "Без имени";
        const createdAt = selected.created_at || "";
        const tableBody = [
            ["№", "Параметр", "Категория", "Балл", "Уровень"],
            ...PAIN_DESCRIPTORS.map((d) => {
                const val =
                    (selected.pain_descriptors && selected.pain_descriptors[d.id]) || 0;
                const cfg = LEVEL_CONFIG[val];
                return [
                    d.id.toString(),
                    d.label,
                    d.category === "sensory" ? "Физическое" : "Эмоциональное",
                    val.toString(),
                    cfg.label,
                ];
            }),
        ];

        const docDefinition = {
            content: [
                { text: "Анкета боли", style: "header" },
                {
                    text: `Пациент: ${fullName}`,
                    style: "subheader",
                    margin: [0, 8, 0, 0],
                },
                {
                    text: `Дата заполнения: ${createdAt}`,
                    style: "subheader",
                    margin: [0, 0, 0, 12],
                },
                { text: "Итоговые показатели", style: "sectionTitle" },
                {
                    ul: [
                        `Общий балл: ${selected.total_score} / 45`,
                        `Физическое влияние: ${selected.sensory_score} / 33`,
                        `Эмоциональное влияние: ${selected.affective_score} / 12`,
                        `Визуальная шкала (VAS): ${selected.vas_score} / 10`,
                        `Интенсивность боли (PPI): ${selected.ppi_score} / 5`,
                    ],
                    margin: [0, 4, 0, 10],
                },
                { text: "Детальные результаты", style: "sectionTitle", margin: [0, 6, 0, 4] },
                {
                    table: {
                        headerRows: 1,
                        widths: ["auto", "*", "auto", "auto", "auto"],
                        body: tableBody,
                    },
                    layout: "lightHorizontalLines",
                    fontSize: 9,
                },
            ],
            defaultStyle: {
                font: "Roboto",
                fontSize: 11,
            },
            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    margin: [0, 0, 0, 4],
                },
                subheader: {
                    fontSize: 10,
                    color: "#555555",
                },
                sectionTitle: {
                    fontSize: 13,
                    bold: true,
                    margin: [0, 8, 0, 2],
                },
            },
        };

        const safeName = fullName.replace(/\s+/g, "_");
        pdfMake.createPdf(docDefinition).download(`SF-MPQ_${safeName || "Patient"}_${selected.id}.pdf`);
    };

    const deleteSelected = async () => {
        if (!selected || selected.error || deleteLoading) return;
        if (!window.confirm("Удалить этот результат?")) return;

        setDeleteLoading(true);
        try {
            const res = await fetch("/backend/delete_assessment.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ id: selected.id }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Не удалось удалить результат");
            }
            setSelected(null);
            await loadAssessments();
        } catch (e) {
            alert(e.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const initDb = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("/backend/admin_init.php", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                },
            });
            const data = await res.json();
            setResult({ ok: res.ok && data.success, data });
        } catch (e) {
            setResult({ ok: false, data: { error: e.message } });
        } finally {
            setLoading(false);
        }
    };

    const loadAssessments = async () => {
        setListLoading(true);
        setListError(null);
        try {
            const res = await fetch("/backend/list_assessments.php", {
                headers: { Accept: "application/json" },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Не удалось загрузить ответы");
            }
            setAssessments(data.items || []);
        } catch (e) {
            setListError(e.message);
        } finally {
            setListLoading(false);
        }
    };

    const loadDetail = async (id) => {
        setDetailLoading(true);
        setSelected(null);
        try {
            const res = await fetch(`/backend/get_assessment.php?id=${id}`, {
                headers: { Accept: "application/json" },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Не удалось загрузить детали");
            }
            setSelected(data.assessment);
        } catch (e) {
            setSelected({ error: e.message });
        } finally {
            setDetailLoading(false);
        }
    };

    const checkAuth = async () => {
        setAuthChecking(true);
        setAuthError(null);
        try {
            const res = await fetch("/backend/check_auth.php", {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Ошибка проверки авторизации");
            }
            setIsAuthed(!!data.authenticated);
        } catch (e) {
            setAuthError(e.message);
            setIsAuthed(false);
        } finally {
            setAuthChecking(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setAuthError(null);
        try {
            const res = await fetch("/backend/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ login, password }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Неверный логин или пароль");
            }
            setIsAuthed(true);
            setPassword("");
        } catch (e) {
            setAuthError(e.message);
            setIsAuthed(false);
        } finally {
            setLoginLoading(false);
        }
    };

    useEffect(() => {
        checkAuth().then(() => {
            // если авторизован — грузим ответы
            if (isAuthed) {
                loadAssessments();
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isAuthed) {
            loadAssessments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthed]);

    if (!isAuthed) {
        return (
            <div className="app">
                <div className="header">
                    <div className="header-eyebrow">NeurologyToolKit · Админка</div>
                    <h1>Авторизация администратора</h1>
                </div>
                <div className="content">
                    <div className="section" style={{ maxWidth: 420, margin: "0 auto" }}>
                        <div className="section-title">Вход</div>
                        <form onSubmit={handleLogin} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                            <input
                                type="text"
                                placeholder="Логин"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                style={{
                                    background: "var(--surface2)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 12,
                                    padding: "10px 14px",
                                    color: "var(--text)",
                                    margin: 0
                                }}
                            />
                            <input
                                type="password"
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    background: "var(--surface2)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 12,
                                    padding: "10px 14px",
                                    color: "var(--text)",
                                }}
                            />
                            <button
                                type="submit"
                                className="export-btn"
                                disabled={loginLoading}
                                style={{ marginTop: 4 }}
                            >
                                {loginLoading ? "Вход..." : "Войти"}
                            </button>
                        </form>
                        {authChecking && (
                            <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                                Проверка сессии...
                            </div>
                        )}
                        {authError && (
                            <div
                                className="alert"
                                style={{
                                    marginTop: 12,
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                }}
                            >
                                <div className="alert-title" style={{ color: "#ef4444" }}>Ошибка</div>
                                <div className="alert-body">{authError}</div>
                            </div>
                        )}
                        <a href="/" className="export-btn" style={{ display: "inline-flex", marginTop: 24 }}>
                            ← На анкету
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="header" style={{ width: '100vw' }}>
                <div className="header-eyebrow">NeurologyToolKit · Админка</div>
                <h1>
                    <a href={'/'}>Анкета боли</a>
                </h1>
            </div>
            <div className="content" style={{ width: '80vw', maxWidth: 'unset' }}>
            {/*    <div className="section">*/}
                    {/*<button*/}
                    {/*    className="export-btn"*/}
                    {/*    onClick={initDb}*/}
                    {/*    disabled={loading}*/}
                    {/*    style={{ marginTop: 16 }}*/}
                    {/*>*/}
                    {/*    {loading ? "Выполняется..." : "Создать / обновить структуру БД"}*/}
                    {/*</button>*/}
                    {result && (
                        <div
                            className="alert"
                            style={{
                                marginTop: 16,
                                background: result.ok
                                    ? "rgba(34,211,165,0.06)"
                                    : "rgba(239,68,68,0.08)",
                                border: result.ok
                                    ? "1px solid rgba(34,211,165,0.25)"
                                    : "1px solid rgba(239,68,68,0.3)",
                            }}
                        >
                            <div
                                className="alert-title"
                                style={{ color: result.ok ? "#22d3a5" : "#ef4444" }}
                            >
                                {result.ok ? "Готово" : "Ошибка"}
                            </div>
                            <div className="alert-body">
                                {result.data?.message || result.data?.error || "хз"}
                            </div>
                        </div>
                    )}
                {/*</div>*/}

                <div className="section">
                    <div className="section-title">Ответы</div>

                    {listLoading && (
                        <div style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
                            Загрузка ответов...
                        </div>
                    )}
                    {listError && (
                        <div
                            className="alert"
                            style={{
                                marginTop: 12,
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.3)",
                            }}
                        >
                            <div className="alert-title" style={{ color: "#ef4444" }}>Ошибка загрузки</div>
                            <div className="alert-body">{listError}</div>
                        </div>
                    )}

                    {!listLoading && !listError && assessments.length === 0 && (
                        <div style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
                            Пока нет сохранённых ответов.
                        </div>
                    )}

                    {!listLoading && assessments.length > 0 && (
                        <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "flex-start" }}>
                            <div style={{ flex: 1, maxHeight: 360, overflowY: "auto" }}>
                                {assessments.map((a) => {
                                    const dt = a.created_at ? new Date(a.created_at.replace(" ", "T")) : null;
                                    const labelDate = dt
                                        ? dt.toLocaleString("ru-RU", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                          })
                                        : "Без даты";
                                    const name = a.full_name || "Без имени";
                                    const isActive = selected && selected.id === a.assessment_id;

                                    return (
                                        <button
                                            key={a.assessment_id}
                                            onClick={() => loadDetail(a.assessment_id)}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid var(--border)",
                                                background: isActive ? "var(--surface2)" : "var(--surface1)",
                                                marginBottom: 8,
                                                cursor: "pointer",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 12,
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>{name}</div>
                                                <div style={{ fontSize: 12, color: "var(--muted)" }}>{labelDate}</div>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    padding: "4px 8px",
                                                    width: "22%",
                                                    borderRadius: 999,
                                                    background: "rgba(59,130,246,0.1)",
                                                    color: "#3b82f6",
                                                }}
                                            >
                                                {a.total_score} / 45
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ flex: 1.3 }}>
                                {detailLoading && (
                                    <div style={{ fontSize: 14, color: "var(--muted)" }}>
                                        Загрузка подробностей...
                                    </div>
                                )}
                                {!detailLoading && selected && selected.error && (
                                    <div
                                        className="alert"
                                        style={{
                                            background: "rgba(239,68,68,0.08)",
                                            border: "1px solid rgba(239,68,68,0.3)",
                                        }}
                                    >
                                        <div className="alert-title" style={{ color: "#ef4444" }}>
                                            Ошибка загрузки
                                        </div>
                                        <div className="alert-body">{selected.error}</div>
                                    </div>
                                )}
                                {!detailLoading && selected && !selected.error && (
                                    <div
                                        style={{
                                            borderRadius: 16,
                                            border: "1px solid var(--border)",
                                            padding: 16,
                                            background: "var(--surface1)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontSize: 13,
                                                color: "var(--muted)",
                                                textTransform: "uppercase",
                                                letterSpacing: "1.5px",
                                                marginBottom: 16,
                                            }}
                                        >
                                            Результат
                                            <button
                                                className="del-btn"
                                                title={"Удалить"}
                                                onClick={deleteSelected}
                                                disabled={deleteLoading}
                                                style={{
                                                    background: "#dc2626" ,
                                                    marginLeft: 'auto'
                                            }}
                                            >
                                                <span className="export-icon">🗑</span>
                                            </button>
                                        </div>
                                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                                            {selected.full_name || "Без имени"}
                                        </div>
                                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                                            {selected.created_at}
                                        </div>

                                        <div className="summary-grid" style={{ marginBottom: 16 }}>
                                            {[
                                                ["Итого", selected.total_score, 45],
                                                ["Физич.", selected.sensory_score, 33],
                                                ["Эмоц.", selected.affective_score, 12],
                                                ["VAS", selected.vas_score, 10],
                                                ["PPI", selected.ppi_score, 5],
                                            ].map(([l, v, m]) => (
                                                <div key={l} className="stat-card">
                                                    <div className="stat-label">{l}</div>
                                                    <div className="stat-val">
                                                        {v}
                                                        <span>/{m}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {Array.isArray(PAIN_DESCRIPTORS) && selected.pain_descriptors && (
                                            <div style={{ marginTop: 8 }}>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    Карта боли
                                                </div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                    {PAIN_DESCRIPTORS.map((d) => {
                                                        const val =
                                                            (selected.pain_descriptors &&
                                                                selected.pain_descriptors[d.id]) || 0;
                                                        const cfg = LEVEL_CONFIG[val];
                                                        return (
                                                            <div
                                                                key={d.id}
                                                                style={{
                                                                    padding: "6px 8px",
                                                                    borderRadius: 999,
                                                                    border: `1px solid ${cfg.border}`,
                                                                    background: cfg.bg,
                                                                    fontSize: 11,
                                                                    color: cfg.color,
                                                                }}
                                                            >
                                                                {d.id}. {d.label}: {cfg.label}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                                            <button
                                                className="export-btn"
                                                onClick={exportSelectedToPDF}
                                                style={{ background: "#1d4ed8" }}
                                            >
                                                <span className="export-icon">📄</span>
                                                Экспортировать в PDF
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {!detailLoading && !selected && assessments.length > 0 && (
                                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                        Выберите запись слева, чтобы увидеть подробный отчёт.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    const [patientName, setPatientName] = useState("");
    const [scores, setScores] = useState(Object.fromEntries(PAIN_DESCRIPTORS.map(d => [d.id, 0])));
    const [vas, setVas] = useState(0);
    const [ppi, setPpi] = useState(0);
    const [open, setOpen] = useState(null);

    const sensory   = [1,2,3,4,5,6,7,8,9,10,11].reduce((s,id) => s + scores[id], 0);
    const affective = [12,13,14,15].reduce((s,id) => s + scores[id], 0);
    const total     = sensory + affective;
    const pct       = (total / 45) * 100;

    const posWarn  = PAIN_DESCRIPTORS.filter(d => scores[d.id] === 1 || scores[d.id] === 2);
    const posAlarm = PAIN_DESCRIPTORS.filter(d => scores[d.id] === 3);
    const negs     = PAIN_DESCRIPTORS.filter(d => scores[d.id] === 0);

    const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString("ru-RU");
        const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

        const detailRows = [
            ["SF-MPQ — Краткий опросник боли McGill"],
            [`Пациент: ${patientName || "Не указано"}`],
            [`Дата: ${dateStr}  Время: ${timeStr}`],
            [],
            ["№", "Параметр", "Категория", "Балл (0–3)", "Уровень"],
            ...PAIN_DESCRIPTORS.map(d => [
                d.id,
                d.label,
                d.category === "sensory" ? "Физическое" : "Эмоциональное",
                scores[d.id],
                LEVEL_CONFIG[scores[d.id]].label,
            ]),
            [],
            ["Визуальная аналоговая шкала (VAS)", "", "", vas, `${vas} / 10`],
            ["Интенсивность боли (PPI)", "", "", ppi, PPI_OPTIONS[ppi].label],
        ];

        const summaryRows = [
            ["SF-MPQ — Итоговые показатели"],
            [`Пациент: ${patientName || "Не указано"}`],
            [`Дата: ${dateStr}  Время: ${timeStr}`],
            [],
            ["Показатель", "Балл", "Максимум", "% от макс."],
            ["Общий балл", total, 45, `${Math.round((total/45)*100)}%`],
            ["Физическое (сенсорное)", sensory, 33, `${Math.round((sensory/33)*100)}%`],
            ["Эмоциональное (аффективное)", affective, 12, `${Math.round((affective/12)*100)}%`],
            ["Визуальная шкала (VAS)", vas, 10, `${Math.round((vas/10)*100)}%`],
            ["Интенсивность (PPI)", ppi, 5, `${Math.round((ppi/5)*100)}%`],
            [],
            ["Симптомы с сильной болью (балл 3):"],
            ...posAlarm.map(d => ["  • " + d.label]),
            posAlarm.length === 0 ? ["  Нет"] : [],
            [],
            ["Симптомы с умеренной болью (балл 1–2):"],
            ...posWarn.map(d => [`  • ${d.label} (${scores[d.id]})`]),
            posWarn.length === 0 ? ["  Нет"] : [],
            [],
            ["Симптомы отсутствуют (балл 0):"],
            ...negs.map(d => ["  • " + d.label]),
        ];

        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.aoa_to_sheet(detailRows);
        ws1["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws1, "Детали");

        const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
        ws2["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Итог");

        XLSX.writeFile(wb, `SF-MPQ_${patientName ? patientName.replace(/\s+/g, "_") : "Patient"}_${dateStr.replace(/\./g, "-")}.xlsx`);
    };

    const [saveStatus, setSaveStatus] = useState(null);

    const saveToDb = async () => {
        setSaveStatus({ loading: true });
        try {
            const res = await fetch("/backend/save_assessment.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    patientName,
                    total,
                    sensory,
                    affective,
                    vas,
                    ppi,
                    scores,
                }),
            });
            const data = await res.json();
            setSaveStatus({
                loading: false,
                ok: res.ok && data.success,
                message: data.message || data.error || "Неизвестный ответ",
            });
        } catch (e) {
            setSaveStatus({
                loading: false,
                ok: false,
                message: e.message,
            });
        }
    };

    if (isAdmin) {
        return <Admin />;
    }

    return (
        <div className="app">
            <div className="header">
                <div className="header-eyebrow">NeurologyToolKit · Оценка боли</div>
                <h1>Короткая анкета McGill<br/>Оценка боли</h1>
                <div className="header-sub">SF-MPQ · Melzack (1987) · 15 параметров · Физические + Эмоциональные</div>
            </div>

            <div className="content">
                {/* Блок информации о пациенте в едином стиле */}
                <div className="section" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            fontSize: '24px',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'var(--surface2)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)'
                        }}>
                            👤
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--muted)',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                marginBottom: '4px'
                            }}>
                                Информация о пациенте
                            </div>
                            <input
                                id="patientName"
                                type="text"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                placeholder="Введите фамилию, имя, отчество"
                                style={{
                                    width: '100%',
                                    background: 'var(--surface2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    color: 'var(--text)',
                                    fontFamily: 'var(--font-sans)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </div>
                </div>

                <div className="accordion">
                    {ACCORDION_SECTIONS.map(sec => (
                        <div key={sec.key} className="acc-item">
                            <button className="acc-btn" onClick={() => setOpen(open === sec.key ? null : sec.key)}>
                                {sec.title}
                                <span className={`acc-chevron ${open === sec.key ? "open" : ""}`}>▼</span>
                            </button>
                            {open === sec.key && <div className="acc-body">{sec.body}</div>}
                        </div>
                    ))}
                </div>

                <div className="score-bar">
                    <div className="score-top">
                        <div className="score-main">Общая оценка боли: <span>{total}</span> / 45</div>
                        <div className="score-subs">
                            <span>Физические: <b>{sensory}/33</b></span>
                            <span>Психологические: <b>{affective}/12</b></span>
                            <span>VAS: <b>{vas}/10</b></span>
                            <span>PPI: <b>{ppi}/5</b></span>
                        </div>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="progress-labels"><span>Нет боли</span><span>Невыносимая боль</span></div>
                </div>

                <div className="section">
                    <div className="section-title">Физическое влияние</div>
                    <div className="section-subtitle">Вопросы 1 – 11 · Суммарно: {sensory} / 33</div>
                    {PAIN_DESCRIPTORS.filter(d => d.category === "sensory").map(item => (
                        <DescriptorRow key={item.id} item={item} value={scores[item.id]}
                                       onChange={v => setScores(p => ({...p, [item.id]: v}))} />
                    ))}
                </div>

                <div className="section">
                    <div className="section-title">Эмоциональное влияние</div>
                    <div className="section-subtitle">Вопросы 12 – 15 · Суммарно: {affective} / 12</div>
                    {PAIN_DESCRIPTORS.filter(d => d.category === "affective").map(item => (
                        <DescriptorRow key={item.id} item={item} value={scores[item.id]}
                                       onChange={v => setScores(p => ({...p, [item.id]: v}))} />
                    ))}
                </div>

                <div className="section">
                    <div className="section-title">Шкала оценки боли</div>
                    <div className="section-subtitle">Интенсивность боли · 0 – 10</div>
                    <div className="vas-wrap">
                        <input type="range" min={0} max={10} value={vas} onChange={e => setVas(Number(e.target.value))} />
                    </div>
                    <div className="vas-value">
                        <span className="vas-number" style={{ color: vas === 0 ? "#22d3a5" : vas <= 5 ? "#f59e0b" : "#ef4444" }}>
                            {vas}<span className="vas-denom"> / 10</span>
                        </span>
                    </div>
                    <div className="vas-labels"><span>Нет боли (0)</span><span>Наисильнейшая боль (10)</span></div>
                </div>

                <div className="section">
                    <div className="section-title">Интенсивность боли</div>
                    <div className="section-subtitle">Текущий уровень · 0 – 5</div>
                    <div className="ppi-grid">
                        {PPI_OPTIONS.map(opt => (
                            <button key={opt.value} className="ppi-btn" onClick={() => setPpi(opt.value)}
                                    style={ppi === opt.value ? {
                                        background: LEVEL_CONFIG[Math.min(opt.value, 3)].bg,
                                        borderColor: LEVEL_CONFIG[Math.min(opt.value, 3)].border,
                                        color: LEVEL_CONFIG[Math.min(opt.value, 3)].color,
                                        fontWeight: 500,
                                    } : {}}>
                                <span style={{ fontSize: 10, opacity: 0.5, marginRight: 6 }}>{opt.value}</span>{opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">Итоговые показатели</div>
                    <div className="section-subtitle">Сводная оценка</div>

                    <div className="summary-grid">
                        {[["Итого", total, 45], ["Физич.", sensory, 33], ["Эмоц.", affective, 12], ["VAS", vas, 10], ["PPI", ppi, 5]].map(([l, v, m]) => (
                            <div key={l} className="stat-card">
                                <div className="stat-label">{l}</div>
                                <div className="stat-val">{v}<span>/{m}</span></div>
                            </div>
                        ))}
                    </div>

                    {posAlarm.length > 0 && (
                        <div className="alert" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                            <div className="alert-title" style={{ color: "#ef4444" }}>🔴 Сильная боль</div>
                            <div className="alert-body" style={{ color: "#fca5a5" }}>{posAlarm.map(d => d.label).join(" · ")}</div>
                        </div>
                    )}
                    {posWarn.length > 0 && (
                        <div className="alert" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
                            <div className="alert-title" style={{ color: "#f59e0b" }}>⚠ Умеренная боль</div>
                            <div className="alert-body" style={{ color: "#fcd34d" }}>{posWarn.map(d => d.label).join(" · ")}</div>
                        </div>
                    )}
                    {negs.length > 0 && (
                        <div className="alert" style={{ background: "rgba(34,211,165,0.06)", border: "1px solid rgba(34,211,165,0.25)" }}>
                            <div className="alert-title" style={{ color: "#22d3a5" }}>✓ Боль отсутствует</div>
                            <div className="alert-body" style={{ color: "#6ee7b7" }}>{negs.map(d => d.label).join(" · ")}</div>
                        </div>
                    )}

                    <div style={{ marginTop: 20, display: 'flex', gap: '10px' }}>
                        {!(saveStatus && saveStatus.ok && !saveStatus.loading) && (
                            <button
                                className="export-btn"
                                onClick={saveToDb}
                                style={{ background: '#16a34a' }}
                            >
                                {saveStatus?.loading ? "Сохранение..." : "Сохранить"}
                            </button>
                        )}
                    </div>
                    {saveStatus && !saveStatus.loading && (
                        <div
                            className="alert"
                            style={{
                                marginTop: 16,
                                background: saveStatus.ok
                                    ? "rgba(34,211,165,0.06)"
                                    : "rgba(239,68,68,0.08)",
                                border: saveStatus.ok
                                    ? "1px solid rgba(34,211,165,0.25)"
                                    : "1px solid rgba(239,68,68,0.3)",
                            }}
                        >
                            <div
                                className="alert-title"
                                style={{
                                    color: saveStatus.ok ? "#22d3a5" : "#ef4444",
                                    display: 'flex',
                                    justifyContent: 'center',
                                    cursor: saveStatus.ok ? 'pointer' : 'default',
                                }}
                                onClick={() => {
                                    if (saveStatus?.ok) {
                                        setSaveStatus(null);
                                    }
                                }}
                            >
                                {saveStatus.ok ? "Сохранено" : "Ошибка сохранения"}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}