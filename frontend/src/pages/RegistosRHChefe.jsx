import React, { useContext, useState, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { Input, Tag, Drawer, Form, Button, Alert, Spin } from 'antd';
import {
    ExclamationCircleOutlined,
    SaveOutlined, CloseOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
    DeleteOutlined, PlusOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL } from "config";
import { RangeDateField } from 'components/FormFields';
import YScroll from 'components/YScroll';
import { AppContext } from './App';
import { LayoutContext } from "./GridLayout";
import DataTable from './DataTable';

/* ─────────────────────────────────────────────────────────────
   Input de data+hora em formato 24h GARANTIDO
   ───────────────────────────────────────────────────────────── */
const DateTime24Input = ({ value, onChange, disabled }) => {
    const parse = (v) => {
        if (!v) return { date: '', hour: '', min: '' };
        const s = String(v).trim().replace('T', ' ');
        const [d = '', t = ''] = s.split(' ');
        const [h = '', m = ''] = t.split(':');
        return { date: d, hour: h.padStart(2, '0'), min: m.padStart(2, '0') };
    };

    const { date, hour, min } = parse(value);

    const emit = (newDate, newHour, newMin) => {
        const d = newDate !== undefined ? newDate : date;
        const h = newHour !== undefined ? newHour : hour;
        const m = newMin  !== undefined ? newMin  : min;
        if (!d && !h && !m) { onChange(null); return; }
        onChange(`${d || ''}T${(h || '00').padStart(2, '0')}:${(m || '00').padStart(2, '0')}`);
    };

    const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const selectCls = `px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 cursor-pointer`;

    return (
        <div className="flex items-center gap-1">
            <input
                type="date"
                value={date}
                disabled={disabled}
                onChange={e => emit(e.target.value, undefined, undefined)}
                className={`flex-1 ${selectCls}`}
            />
            <span className="text-slate-400 font-bold text-sm shrink-0">às</span>
            <select
                value={hour}
                disabled={disabled}
                onChange={e => emit(undefined, e.target.value, undefined)}
                className={`w-[62px] ${selectCls}`}
            >
                <option value="">HH</option>
                {hours.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-slate-400 font-bold shrink-0">:</span>
            <select
                value={min}
                disabled={disabled}
                onChange={e => emit(undefined, undefined, e.target.value)}
                className={`w-[62px] ${selectCls}`}
            >
                <option value="">MM</option>
                {minutes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   FixRecord — drawer de edição de picagens
   ───────────────────────────────────────────────────────────── */
const FixRecord = ({ record, openNotification, onSave, onCancel }) => {
    const submitting = useSubmitting(false);
    const [formStatus, setFormStatus] = useState({ error: [] });
    const [picagens, setPicagens] = useState([]);

    const typeOptions = [
        { value: "",    label: "— Não definido —" },
        { value: "in",  label: "Entrada" },
        { value: "out", label: "Saída" }
    ];

    React.useEffect(() => {
        if (!record) return;
        const items = [];
        for (let i = 1; i <= 8; i++) {
            const padded = String(i).padStart(2, '0');
            const ss = record[`ss_${padded}`];
            const ty = record[`ty_${padded}`];
            if (ss || ty) {
                let ssNorm = '';
                if (ss) {
                    const s = String(ss).trim().replace('T', ' ');
                    const [d = '', t = ''] = s.split(' ');
                    ssNorm = `${d}T${t.slice(0, 5)}`;
                }
                items.push({ ss: ssNorm, ty: ty ? String(ty).trim() : '' });
            }
        }
        if (items.length === 0) items.push({ ss: '', ty: '' });
        setPicagens(items);
    }, [record]);

    const updatePicagem = (idx, field, val) =>
        setPicagens(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));

    const moveUp = (idx) => {
        if (idx === 0) return;
        setPicagens(prev => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const moveDown = (idx) => {
        setPicagens(prev => {
            if (idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    const removePicagem = (idx) =>
        setPicagens(prev => {
            const next = prev.filter((_, i) => i !== idx);
            return next.length === 0 ? [{ ss: '', ty: '' }] : next;
        });

    const addPicagem = () => {
        if (picagens.length >= 8) return;
        setPicagens(prev => [...prev, { ss: '', ty: '' }]);
    };

    const handleSave = async () => {
        submitting.trigger();
        setFormStatus({ error: [] });
        try {
            const payload = {
                num: record.num,
                dts: record.dts ? String(record.dts).slice(0, 10) : ''
            };
            for (let i = 1; i <= 8; i++) {
                const padded = String(i).padStart(2, '0');
                const item = picagens[i - 1];
                payload[`ss_${padded}`] = item?.ss || null;
                payload[`ty_${padded}`] = item?.ty || null;
            }

            await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "UpdatePicagem" },
                filter: { payload }
            });

            openNotification("success", 'top', "Sucesso", "Registo actualizado com sucesso!");

            const updatedRecord = { ...record };
            for (let i = 1; i <= 8; i++) {
                const padded = String(i).padStart(2, '0');
                updatedRecord[`ss_${padded}`] = payload[`ss_${padded}`];
                updatedRecord[`ty_${padded}`] = payload[`ty_${padded}`];
            }
            updatedRecord.nt = picagens.filter(p => p.ss).length;
            onSave(updatedRecord);
        } catch (e) {
            setFormStatus({ error: [e.message] });
            openNotification("error", 'top', "Erro", e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Cabeçalho do registo */}
            <div className="px-5 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {record?.num}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">{record?.nome_colaborador || record?.num}</p>
                        <p className="text-xs text-slate-500">{record?.dts ? String(record.dts).slice(0, 10) : '—'}</p>
                    </div>
                    {record?.dep && (
                        <Tag color="blue" className="font-semibold text-xs ml-auto">{record.dep}</Tag>
                    )}
                </div>
            </div>

            {formStatus.error.length > 0 && (
                <Alert
                    message={formStatus.error.join(", ")}
                    type="error" closable
                    onClose={() => setFormStatus({ error: [] })}
                    className="mx-4 mt-4"
                />
            )}

            <YScroll className="flex-1">
                <div className="p-5">
                    <Spin spinning={submitting.state}>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Picagens do dia</span>
                            {picagens.length < 8 && (
                                <button
                                    onClick={addPicagem}
                                    disabled={submitting.state}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100
                                               text-blue-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                                >
                                    <PlusOutlined /> Adicionar
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {picagens.map((p, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mt-1 shrink-0">
                                        {idx + 1}
                                    </span>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div>
                                            <p className="text-[10px] text-slate-400 mb-1 font-medium">Data e Hora (24h)</p>
                                            <DateTime24Input
                                                value={p.ss}
                                                onChange={val => updatePicagem(idx, 'ss', val || '')}
                                                disabled={submitting.state}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 mb-1 font-medium">Tipo</p>
                                            <select
                                                value={p.ty}
                                                onChange={e => updatePicagem(idx, 'ty', e.target.value)}
                                                disabled={submitting.state}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm
                                                           bg-white text-slate-700 focus:outline-none focus:ring-2
                                                           focus:ring-blue-500 disabled:bg-slate-50"
                                            >
                                                {typeOptions.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 shrink-0 mt-1">
                                        <button
                                            onClick={() => moveUp(idx)}
                                            disabled={idx === 0 || submitting.state}
                                            title="Mover para cima"
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded
                                                       disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowUpOutlined style={{ fontSize: 11 }} />
                                        </button>
                                        <button
                                            onClick={() => moveDown(idx)}
                                            disabled={idx === picagens.length - 1 || submitting.state}
                                            title="Mover para baixo"
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded
                                                       disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowDownOutlined style={{ fontSize: 11 }} />
                                        </button>
                                        <button
                                            onClick={() => removePicagem(idx)}
                                            disabled={submitting.state}
                                            title="Remover"
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded
                                                       disabled:opacity-20 transition-colors"
                                        >
                                            <DeleteOutlined style={{ fontSize: 11 }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Spin>
                </div>
            </YScroll>

            <div className="shrink-0 p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
                <Button onClick={onCancel} icon={<CloseOutlined />} className="rounded-lg">
                    Cancelar
                </Button>
                <Button
                    type="primary"
                    onClick={handleSave}
                    loading={submitting.state}
                    icon={<SaveOutlined />}
                    className="rounded-lg bg-blue-600 border-0 hover:bg-blue-700"
                >
                    Guardar alterações
                </Button>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Page Header
   ───────────────────────────────────────────────────────────── */
const PageHeader = ({ title, subtitle, tag, tagColor = 'blue' }) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-800">{title}</h1>
                {tag && <Tag color={tagColor} className="font-bold text-sm px-3 py-1">{tag}</Tag>}
            </div>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN
   ───────────────────────────────────────────────────────────── */
export default function RegistosRHChefe() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRH       = auth?.isRH      || false;
    const isChefe    = auth?.isChefe    || false;
    const deps_chefe = auth?.deps_chefe || [];
    const isColab    = !isRH && !isChefe;

    // Estado do drawer de edição
    const [showFix, setShowFix]           = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Patch cirúrgico na linha da tabela (sem refetch)
    const patchRowRef = useRef(null);
    const handleRegisterPatch = useCallback((fn) => { patchRowRef.current = fn; }, []);

    const rowKey = (row) => `${row?.num}|${String(row?.dts || '').slice(0, 10)}`;

    const handleRowSaved = useCallback((updatedRecord) => {
        if (patchRowRef.current) {
            const key = rowKey(updatedRecord);
            patchRowRef.current(
                (row) => rowKey(row) === key,
                updatedRecord
            );
        }
        setShowFix(false);
        setSelectedRecord(null);
    }, []);

    /* ── Textos de contexto ── */
    const title = isRH
        ? 'Registo de Picagens'
        : isChefe
            ? 'Picagens do Departamento'
            : 'As Minhas Picagens';

    const subtitle = isRH
        ? 'Todos os colaboradores'
        : isChefe
            ? `Departamento(s): ${deps_chefe.join(', ')}`
            : 'Os seus registos pessoais';

    const tag = isRH
        ? 'Todos os departamentos'
        : isChefe
            ? deps_chefe.join(', ')
            : `${auth?.first_name || ''} ${auth?.last_name || ''}`.trim();

    /* ── Colunas ── */
    const colColaborador = {
        title: 'Colaborador', dataIndex: 'num', sticky: true,
        style: { minWidth: 180 },
        render: (val, row) => (
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700
                                text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                    {String(val).slice(-2)}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">
                        {row.nome_colaborador || `Nº ${val}`}
                    </p>
                    <p className="text-[10px] text-slate-400">Nº {val}</p>
                </div>
            </div>
        )
    };

    const colDepartamento = {
        title: 'Departamento', dataIndex: 'dep',
        style: { minWidth: 100 },
        render: (val) => <Tag color="blue" className="font-semibold text-xs">{val || '—'}</Tag>
    };

    const colData = {
        title: 'Data', dataIndex: 'dts',
        style: { minWidth: 100 },
        render: (val) => (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600
                             bg-slate-50 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                {dayjs(val).format('DD/MM/YYYY')}
            </span>
        )
    };

    const colPicagens = {
        title: 'Picagens', dataIndex: 'nt',
        style: { minWidth: 80, textAlign: 'center' },
        render: (val) => (
            <span className="inline-flex items-center justify-center w-7 h-7
                             bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                {val || 0}
            </span>
        )
    };

    const colsPx = [...Array(8)].map((_, i) => ({
        title: `P${i + 1}`,
        dataIndex: `ss_${String(i + 1).padStart(2, '0')}`,
        style: { minWidth: 90, textAlign: 'center' },
        render: (val, row) => {
            const typeVal = row[`ty_${String(i + 1).padStart(2, '0')}`];
            const type    = typeVal ? String(typeVal).trim().toLowerCase() : null;
            return val ? (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg
                    text-[10px] font-bold whitespace-nowrap
                    ${type === 'in'  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : type === 'out' ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    :                  'bg-slate-50 text-slate-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full
                        ${type === 'in' ? 'bg-green-500' : type === 'out' ? 'bg-red-500' : 'bg-slate-400'}`} />
                    {dayjs(val).format('HH:mm')}
                </div>
            ) : <span className="text-slate-300 text-[10px]">—</span>;
        }
    }));

    const columns = useMemo(() => [
        ...(!isColab ? [colColaborador, colDepartamento] : []),
        colData, colPicagens, ...colsPx
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [isColab]);

    /* ── Filtros ── */
    const filterFields = useMemo(() => [
        ...(!isColab ? [{
            name: 'fnum', label: 'Número',
            component: <Input placeholder="Ex: F00016" size="middle" style={{ width: 130 }} />
        }] : []),
        { name: 'fdata', label: 'Período', component: <RangeDateField size="middle" /> }
    ], [isColab]);

    /* ── API config — memoizado para evitar re-renders ── */
    const apiConfig = useMemo(() => ({
        url:    `${API_URL}/rponto/sqlp/`,
        method: 'RegistosRH',
        extraFilter: { isRH, isChefe, deps_chefe },
        defaultFilter: isColab ? { fnum: auth?.num } : {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [isRH, isChefe, isColab, auth?.num, JSON.stringify(deps_chefe)]);

    const defaultSort = useMemo(() => [
        { column: "dts", direction: "DESC" },
        { column: "num", direction: "ASC"  }
    ], []);

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={title} subtitle={subtitle} tag={tag}
                tagColor={isRH ? 'purple' : isChefe ? 'blue' : 'green'}
            />

            <div className="flex-1 min-h-0">
                <DataTable
                    columns={columns}
                    apiConfig={apiConfig}
                    filterFields={filterFields}
                    defaultSort={defaultSort}
                    pageSize={20}
                    openNotification={openNotification}
                    onRegisterPatch={handleRegisterPatch}
                    /* Só RH e Chefe podem editar — colaborador simples não */
                    onRowEdit={!isColab ? (row) => { setSelectedRecord(row); setShowFix(true); } : undefined}
                />
            </div>

            {/* Drawer de edição de picagens */}
            <Drawer
                title={
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                        <ExclamationCircleOutlined className="text-red-500" />
                        Corrigir Registo
                    </div>
                }
                width={700}
                open={showFix}
                onClose={() => { setShowFix(false); setSelectedRecord(null); }}
                destroyOnClose
                bodyStyle={{ padding: 0, background: '#f8fafc' }}
            >
                {selectedRecord && (
                    <FixRecord
                        record={selectedRecord}
                        openNotification={openNotification}
                        onSave={handleRowSaved}
                        onCancel={() => { setShowFix(false); setSelectedRecord(null); }}
                    />
                )}
            </Drawer>
        </div>
    );
}