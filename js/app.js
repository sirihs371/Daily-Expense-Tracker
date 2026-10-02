const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
const h = React.createElement;
const CATS = ['Food', 'Transport', 'Bills', 'Shopping', 'Fun', 'Health'];
const COL = { Food: '#f59e0b', Transport: '#3b82f6', Bills: '#ef4444', Shopping: '#a855f7', Fun: '#10b981', Health: '#ec4899' };
const fmt = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const SEED = [
  { id: 1, title: 'Groceries', amount: 54.2, category: 'Food', date: '2026-10-01' },
  { id: 2, title: 'Metro pass', amount: 30, category: 'Transport', date: '2026-09-29' },
  { id: 3, title: 'Electricity bill', amount: 82.75, category: 'Bills', date: '2026-09-27' },
  { id: 4, title: 'Movie night', amount: 18, category: 'Fun', date: '2026-09-20' },
  { id: 5, title: 'Sneakers', amount: 64, category: 'Shopping', date: '2026-08-14' },
  { id: 6, title: 'Pharmacy', amount: 22.5, category: 'Health', date: '2026-08-05' },
  { id: 7, title: 'Rent share', amount: 120, category: 'Bills', date: '2026-07-02' }
];
// Mock API: returns saved data (or seed data) after a delay
const loadExpensesApi = () => new Promise((res) => setTimeout(() => res(store.get('sw_expenses', SEED)), 700));

const Row = memo(function Row({ e, onDelete }) {
  return h('div', { className: 'item' },
    h('span', { className: 'dot', style: { background: COL[e.category] } }),
    h('div', { className: 't' }, h('strong', null, e.title), h('small', null, e.category + ' · ' + e.date)),
    h('b', null, fmt(e.amount)),
    onDelete && h('button', { className: 'x', onClick: () => onDelete(e.id), 'aria-label': 'Delete' }, '✕'));
});

function useStats(expenses) {
  return useMemo(() => {
    const month = today().slice(0, 7);
    let total = 0, thisMonth = 0; const cat = {}, mon = {};
    expenses.forEach((x) => {
      total += x.amount; if (x.date.slice(0, 7) === month) thisMonth += x.amount;
      cat[x.category] = (cat[x.category] || 0) + x.amount;
      const k = x.date.slice(0, 7); mon[k] = (mon[k] || 0) + x.amount;
    });
    const cats = CATS.filter((c) => cat[c]).map((c) => ({ c, v: cat[c] })).sort((a, b) => b.v - a.v);
    const months = Object.keys(mon).sort().slice(-6).map((k) => ({ k, v: mon[k] }));
    return { total, thisMonth, cats, months };
  }, [expenses]);
}

function Dashboard({ expenses, s, budget, setBudget }) {
  const pct = Math.min(100, (s.thisMonth / budget) * 100);
  const recent = useMemo(() => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [expenses]);
  return h('div', null,
    h('h1', null, 'Dashboard'), h('p', { className: 'sub' }, 'Your spending at a glance.'),
    h('div', { className: 'stats' },
      h('div', { className: 'card stat' }, h('small', null, 'Total spent'), h('b', null, fmt(s.total))),
      h('div', { className: 'card stat' }, h('small', null, 'This month'), h('b', null, fmt(s.thisMonth))),
      h('div', { className: 'card stat' }, h('small', null, 'Transactions'), h('b', null, expenses.length)),
      h('div', { className: 'card stat' }, h('small', null, 'Top category'), h('b', null, s.cats[0] ? s.cats[0].c : '-'))),
    h('div', { className: 'card' }, h('h2', null, 'Monthly budget'),
      h('div', null, fmt(s.thisMonth) + ' of ' + fmt(budget) + (s.thisMonth > budget ? ' (over budget!)' : '')),
      h('div', { className: 'track' }, h('div', { className: 'fill', style: { width: pct + '%', background: s.thisMonth > budget ? 'var(--danger)' : 'var(--ok)' } })),
      h('label', null, 'Set budget'),
      h('input', { type: 'number', min: '1', value: budget, onChange: (e) => setBudget(Math.max(1, +e.target.value || 1)) })),
    h('div', { className: 'card' }, h('h2', null, 'Recent expenses'),
      recent.length ? recent.map((e) => h(Row, { key: e.id, e })) : h('div', { className: 'muted' }, 'Nothing yet.')));
}

function Expenses({ expenses, setExpenses }) {
  const [form, setForm] = useState({ title: '', amount: '', category: CATS[0], date: today() });
  const [error, setError] = useState('');
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [sort, setSort] = useState('new');
  const tRef = useRef(null), aRef = useRef(null);
  useEffect(() => { tRef.current.focus(); }, []);
  const onChange = useCallback((ev) => { const { name, value } = ev.target; setForm((f) => ({ ...f, [name]: value })); }, []);
  const add = useCallback(() => {
    const amt = parseFloat(form.amount);
    if (!form.title.trim()) { setError('Please enter a title.'); tRef.current.focus(); return; }
    if (!(amt > 0)) { setError('Enter an amount greater than 0.'); aRef.current.focus(); return; }
    setError('');
    setExpenses((p) => [{ id: Date.now(), title: form.title.trim(), amount: amt, category: form.category, date: form.date || today() }, ...p]);
    setForm((f) => ({ ...f, title: '', amount: '' })); tRef.current.focus();
  }, [form, setExpenses]);
  const del = useCallback((id) => setExpenses((p) => p.filter((x) => x.id !== id)), [setExpenses]);
  const list = useMemo(() => {
    const r = expenses.filter((x) => (cat === 'All' || x.category === cat) && x.title.toLowerCase().includes(q.toLowerCase()));
    const f = { new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date), high: (a, b) => b.amount - a.amount, low: (a, b) => a.amount - b.amount }[sort];
    return r.sort(f);
  }, [expenses, q, cat, sort]);
  const sum = useMemo(() => list.reduce((s, x) => s + x.amount, 0), [list]);
  const fld = (l, el) => h('div', null, h('label', null, l), el);
  return h('div', null,
    h('h1', null, 'Expenses'), h('p', { className: 'sub' }, 'Add, search and manage your expenses.'),
    h('div', { className: 'card' }, h('h2', null, 'Add expense'),
      h('div', { className: 'formgrid' },
        fld('Title', h('input', { ref: tRef, name: 'title', value: form.title, onChange, placeholder: 'e.g. Coffee' })),
        fld('Amount', h('input', { ref: aRef, name: 'amount', type: 'number', min: '0', step: '0.01', value: form.amount, onChange })),
        fld('Category', h('select', { name: 'category', value: form.category, onChange }, CATS.map((c) => h('option', { key: c }, c)))),
        fld('Date', h('input', { name: 'date', type: 'date', value: form.date, onChange }))),
      error && h('p', { className: 'err', role: 'alert' }, error),
      h('button', { className: 'btn', onClick: add }, 'Add expense')),
    h('div', { className: 'card' }, h('h2', null, 'All expenses (' + list.length + ') — ' + fmt(sum)),
      h('div', { className: 'row' },
        h('input', { placeholder: 'Search…', value: q, onChange: (e) => setQ(e.target.value) }),
        h('select', { value: cat, onChange: (e) => setCat(e.target.value) }, ['All'].concat(CATS).map((c) => h('option', { key: c }, c))),
        h('select', { value: sort, onChange: (e) => setSort(e.target.value) },
          [['new', 'Newest'], ['old', 'Oldest'], ['high', 'Highest'], ['low', 'Lowest']].map((o) => h('option', { key: o[0], value: o[0] }, o[1])))),
      list.length ? list.map((e) => h(Row, { key: e.id, e, onDelete: del })) : h('div', { className: 'muted' }, 'No expenses found.')));
}

function Reports({ s }) {
  const max = Math.max(1, ...s.months.map((m) => m.v));
  let acc = 0;
  const grad = s.cats.map((c) => { const a = acc, b = acc + (c.v / s.total) * 100; acc = b; return COL[c.c] + ' ' + a + '% ' + b + '%'; }).join(',');
  return h('div', null,
    h('h1', null, 'Reports'), h('p', { className: 'sub' }, 'Where your money goes, month by month.'),
    h('div', { className: 'two' },
      h('div', { className: 'card' }, h('h2', null, 'By category'),
        s.cats.length ? h('div', null, h('div', { className: 'donut', style: { background: 'conic-gradient(' + grad + ')' } }),
          s.cats.map((c) => h('div', { key: c.c }, h('div', null, c.c + ' — ' + fmt(c.v) + ' (' + Math.round((c.v / s.total) * 100) + '%)'),
            h('div', { className: 'track' }, h('div', { className: 'fill', style: { width: (c.v / s.total) * 100 + '%', background: COL[c.c] } })))))
          : h('div', { className: 'muted' }, 'No data.')),
      h('div', { className: 'card' }, h('h2', null, 'Monthly spending'),
        h('div', { className: 'cols' }, s.months.map((m) => h('div', { className: 'col', key: m.k }, h('span', null, '₹' + Math.round(m.v)), h('div', { style: { height: (m.v / max) * 80 + '%' } }), h('span', null, m.k.slice(2))))))));
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(() => store.get('sw_budget', 300));
  const [page, setPage] = useState(location.hash.slice(2) || 'dashboard');
  useEffect(() => { let live = true; loadExpensesApi().then((d) => { if (live) { setExpenses(d); setLoading(false); } }); return () => { live = false; }; }, []);
  useEffect(() => { if (!loading) store.set('sw_expenses', expenses); }, [expenses, loading]);
  useEffect(() => { store.set('sw_budget', budget); }, [budget]);
  useEffect(() => { const f = () => setPage(location.hash.slice(2) || 'dashboard'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  const s = useStats(expenses);
  const link = (id, label) => h('a', { href: '#/' + id, className: page === id ? 'on' : '' }, label);
  return h('div', { className: 'app' },
    h('nav', { className: 'side' }, h('div', { className: 'logo' }, '💸 SpendWise'), link('dashboard', 'Dashboard'), link('expenses', 'Expenses'), link('reports', 'Reports')),
    h('main', { className: 'main' }, loading ? h('div', { className: 'muted' }, 'Loading from mock API…')
      : page === 'expenses' ? h(Expenses, { expenses, setExpenses })
      : page === 'reports' ? h(Reports, { s })
      : h(Dashboard, { expenses, s, budget, setBudget })));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
