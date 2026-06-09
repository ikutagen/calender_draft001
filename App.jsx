import React, { useState, useEffect } from 'react';

// ── 共通のボタンコンポーネント ──
const Btn = ({ onClick, children, bg, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: bg || '#4a6fa5',
      color: color || '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 12,
      fontWeight: 'bold',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}
  >
    {children}
  </button>
);

export default function App() {
  // ── 状態管理（ステート） ──
  const [clinics, setClinics] = useState({ byId: {}, allIds: [] });
  const [saves, setSaves] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('編集');
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [saveName, setSaveName] = useState('');

  // カレンダーの入力データ用ステート
  const [state, setState] = useState({
    title: '5月度 診療スケジュール',
    sub: '※急な変更が入る場合がございます。最新情報はWEBをご確認ください。',
    note: '【休診】木曜・祝日・日曜午後\n【備考】5/3〜5/5はGWのため終日休診となります。',
    weeks: [
      { id: 1, days: [
        { d: '27', m: '4', bg: '#f4f4f4', text: '通常', note: '' },
        { d: '28', m: '4', bg: '#ffffff', text: '通常', note: '' },
        { d: '29', m: '4', bg: '#fff0f0', text: '祝日', note: '昭和の日' },
        { d: '30', m: '4', bg: '#ffffff', text: '通常', note: '' },
        { d: '1',  m: '5', bg: '#ffffff', text: '通常', note: '' },
        { d: '2',  m: '5', bg: '#ffffff', text: '午前のみ', note: '午後休診' },
        { d: '3',  m: '5', bg: '#fff0f0', text: '休診', note: '憲法記念日' }
      ]},
      { id: 2, days: [
        { d: '4',  m: '5', bg: '#fff0f0', text: '休診', note: 'みどりの日' },
        { d: '5',  m: '5', bg: '#fff0f0', text: '休診', note: 'こどもの日' },
        { d: '6',  m: '5', bg: '#fff0f0', text: '振替休日', note: '' },
        { d: '7',  m: '5', bg: '#f9f9f9', text: '木曜休診', note: '' },
        { d: '8',  m: '5', bg: '#ffffff', text: '通常', note: '' },
        { d: '9',  m: '5', bg: '#ffffff', text: '午前のみ', note: '午後休診' },
        { d: '10', m: '5', bg: '#fff0f0', text: '日祝休診', note: '' }
      ]}
    ]
  });

  // ── 初期データの読み込み ──
  useEffect(() => {
    const local = localStorage.getItem('clinic_builder_data');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.clinics && parsed.saves) {
          setClinics(parsed.clinics);
          setSaves(parsed.saves);
          if (parsed.activeId) {
            setActiveId(parsed.activeId);
            if (parsed.clinics.byId[parsed.activeId]) {
              setState(parsed.clinics.byId[parsed.activeId]);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // ── データの自動保存 ──
  const saveToLocal = (newClinics, newSaves, newActiveId) => {
    localStorage.setItem('clinic_builder_data', JSON.stringify({
      clinics: newClinics,
      saves: newSaves,
      activeId: newActiveId
    }));
  };

  // ── 新規作成 ──
  const doNew = () => {
    if (window.confirm('現在の編集内容を破棄して、新しく作成しますか？')) {
      const blank = {
        title: '新カレンダー', sub: '', note: '',
        weeks: [{ id: 1, days: Array(7).fill(null).map(() => ({ d: '', m: '', bg: '#ffffff', text: '', note: '' })) }]
      };
      setState(blank);
      setActiveId(null);
    }
  };

  // ── 保存処理 ──
  const doSave = () => {
    if (!saveName.trim()) return alert('名前を入力してください');
    const id = activeId || 'id_' + Date.now();
    const updatedClinics = {
      ...clinics,
      byId: { ...clinics.byId, [id]: { ...state, title: saveName } },
      allIds: clinics.allIds.includes(id) ? clinics.allIds : [...clinics.allIds, id]
    };
    const updatedSaves = saves.some(s => s.id === id)
      ? saves.map(s => s.id === id ? { ...s, name: saveName } : s)
      : [...saves, { id, name: saveName }];

    setClinics(updatedClinics);
    setSaves(updatedSaves);
    setActiveId(id);
    setShowSave(false);
    saveToLocal(updatedClinics, updatedSaves, id);
    alert('保存しました！');
  };

  // ── 読込処理 ──
  const doLoad = (id) => {
    const target = clinics.byId[id];
    if (target) {
      setState(target);
      setActiveId(id);
      setSaveName(saves.find(s => s.id === id)?.name || '');
      setShowLoad(false);
    }
  };

  // ── ★追加したロジック①：データの外部書き出し（エクスポート） ──
  const exportDataJson = () => {
    const dataStr = JSON.stringify({ clinics, saves, activeId });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const filename = `calendar_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
  };

  // ── ★追加したロジック②：データの取り込み（インポート） ──
  const importDataJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.clinics && parsed.saves) {
          setClinics(parsed.clinics);
          setSaves(parsed.saves);
          if (parsed.activeId && parsed.clinics.byId[parsed.activeId]) {
            setActiveId(parsed.activeId);
            setState(parsed.clinics.byId[parsed.activeId]);
          }
          // ブラウザの保存領域（LocalStorage）も同時に更新する
          saveToLocal(parsed.clinics, parsed.saves, parsed.activeId || null);
          alert("別のデバイスからデータを正常に引き継ぎました！");
        } else {
          alert("データの形式が正しくありません。");
        }
      } catch (err) {
        alert("インポートに失敗しました。ファイルをご確認ください。");
      }
    };
    reader.readAsText(file);
  };

  // ── マス目の編集処理 ──
  const updateDay = (wIdx, dIdx, field, val) => {
    const newWeeks = [...state.weeks];
    newWeeks[wIdx].days[dIdx] = { ...newWeeks[wIdx].days[dIdx], [field]: val };
    setState({ ...state, weeks: newWeeks });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f5f7fb', color: '#333' }}>
      
      {/* ── 左側：操作パネル ── */}
      <div style={{ width: 320, background: '#202634', color: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 15, overflowY: 'auto' }}>
        <div>
          <h2 style={{ fontSize: 16, margin: '0 0 10px 0', color: '#4a6fa5' }}>カレンダービルダー</h2>
          
          {/* 上段ボタン群 */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <Btn bg="#444" color="#aaa" onClick={doNew}>＋ 新規</Btn>
            <Btn bg="#4a6fa5" color="#fff" onClick={() => { setSaveName(state.title); setShowSave(true); }}>💾 保存</Btn>
            <Btn bg="#444" color="#e0e0e0" onClick={() => setShowLoad(true)}>📂 読込</Btn>
            <Btn bg={tab === '出力' ? '#4a6fa5' : '#444'} color="#fff" onClick={() => setTab(tab === '出力' ? '編集' : '出力')}>⬇ 出力</Btn>
          </div>

          {/* ★追加したUI：デバイス間データ引継ぎボタン */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6, borderTop: '1px solid #333', paddingTop: 6 }}>
            <Btn bg="#2e5a2e" color="#fff" onClick={exportDataJson}>📤 引継データ出力</Btn>
            <label style={{ background: '#5a4a7e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 'bold', display: 'inline-block' }}>
              📥 引継データ読込
              <input type="file" accept=".json" onChange={importDataJson} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {tab === '編集' ? (
          <>
            {/* テキスト編集エリア */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#aaa' }}>メインタイトル</label>
              <input type="text" value={state.title} onChange={e => setState({ ...state, title: e.target.value })} style={{ padding: 8, borderRadius: 4, border: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#aaa' }}>サブタイトル</label>
              <input type="text" value={state.sub} onChange={e => setState({ ...state, sub: e.target.value })} style={{ padding: 8, borderRadius: 4, border: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#aaa' }}>下部注意書き（改行可）</label>
              <textarea value={state.note} onChange={e => setState({ ...state, note: e.target.value })} rows={4} style={{ padding: 8, borderRadius: 4, border: 'none', resize: 'vertical' }} />
            </div>

            {/* 週の追加・削除 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Btn bg="#333" onClick={() => {
                const newWeeks = [...state.weeks, { id: Date.now(), days: Array(7).fill(null).map(() => ({ d: '', m: '', bg: '#ffffff', text: '', note: '' })) }];
                setState({ ...state, weeks: newWeeks });
              }}>＋ 週を追加</Btn>
              <Btn bg="#d9534f" disabled={state.weeks.length <= 1} onClick={() => {
                setState({ ...state, weeks: state.weeks.slice(0, -1) });
              }}>➖ 週を削除</Btn>
            </div>
          </>
        ) : (
          <div style={{ background: '#161b26', padding: 10, borderRadius: 6, fontSize: 12 }}>
            <p style={{ margin: '0 0 10px 0', color: '#aaa' }}>画像を保存する場合は、右側のカレンダー画面を右クリック（スマホは長押し）して保存するか、スクリーンショットを撮ってください。</p>
            <Btn bg="#4a6fa5" onClick={() => setTab('編集')}>編集に戻る</Btn>
          </div>
        )}
      </div>

      {/* ── 右側：プレビュー画面 ── */}
      <div style={{ flex: 1, padding: 40, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 800, background: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {/* タイトル部 */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, margin: '0 0 5px 0', color: '#222' }}>{state.title}</h1>
            <p style={{ fontSize: 13, margin: 0, color: '#666' }}>{state.sub}</p>
          </div>

          {/* カレンダー本体 */}
          <div style={{ border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
            {/* 曜日ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f5f5f5', borderBottom: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center', fontSize: 13 }}>
              {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => (
                <div key={i} style={{ padding: 10, color: i === 5 ? '#2f5bb7' : i === 6 ? '#ce3c3c' : '#333' }}>{w}</div>
              ))}
            </div>

            {/* 各マス目 */}
            {state.weeks.map((week, wIdx) => (
              <div key={week.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wIdx === state.weeks.length - 1 ? 'none' : '1px solid #eee' }}>
                {week.days.map((day, dIdx) => (
                  <div key={dIdx} style={{ background: day.bg, padding: 8, minHeight: 80, borderRight: dIdx === 6 ? 'none' : '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* 日付入力 */}
                      <input type="text" placeholder="日" value={day.d} onChange={e => updateDay(wIdx, dIdx, 'd', e.target.value)} style={{ width: 24, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 'bold' }} />
                      {/* 色選択 */}
                      {tab === '編集' && (
                        <select value={day.bg} onChange={e => updateDay(wIdx, dIdx, 'bg', e.target.value)} style={{ fontSize: 10, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                          <option value="#ffffff">白(通常)</option>
                          <option value="#fff0f0">赤(休診)</option>
                          <option value="#f9f9f9">灰(木曜)</option>
                          <option value="#f4f4f4">他</option>
                        </select>
                      )}
                    </div>
                    {/* ステータス・テキスト入力 */}
                    <input type="text" placeholder="状態" value={day.text} onChange={e => updateDay(wIdx, dIdx, 'text', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, textAlign: 'center', fontWeight: 'bold', margin: '4px 0' }} />
                    <input type="text" placeholder="備考" value={day.note} onChange={e => updateDay(wIdx, dIdx, 'note', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 10, color: '#777', textAlign: 'center' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 下部注意書き */}
          {state.note && (
            <div style={{ marginTop: 20, padding: 15, background: '#f9f9f9', borderRadius: 6, fontSize: 12, color: '#444', whiteSpace: 'pre-wrap', lineHeight: 1.6, borderLeft: '4px solid #4a6fa5' }}>
              {state.note}
            </div>
          )}
        </div>
      </div>

      {/* ── ポップアップ：保存画面 ── */}
      {showSave && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>カレンダーを保存</h3>
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="保存名（例: 5月スケジュール）" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn bg="#aaa" onClick={() => setShowSave(false)}>キャンセル</Btn>
              <Btn bg="#4a6fa5" onClick={doSave}>保存する</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── ポップアップ：読込画面 ── */}
      {showLoad && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>保存データ一覧</h3>
            {saves.length === 0 ? (
              <p style={{ fontSize: 12, color: '#777', margin: '10px 0' }}>保存されたデータはありません。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                {saves.map(s => (
                  <button key={s.id} onClick={() => doLoad(s.id)} style={{ padding: 8, textAlign: 'left', background: '#f5f5f5', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{s.name}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn bg="#aaa" onClick={() => setShowLoad(false)}>閉じる</Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
