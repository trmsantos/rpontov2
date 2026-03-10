import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { Drawer, Input, Image, Form, Button, Alert, Spin } from 'antd';
import {
    CameraOutlined, SyncOutlined, SaveOutlined,
    CloseOutlined, UserOutlined, WarningOutlined, ExclamationCircleOutlined,
    FilterOutlined, LoginOutlined, LogoutOutlined, SwapOutlined,
    ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL, FILES_URL, DATE_FORMAT, DATETIME_FORMAT } from "config";
import { useDataAPI } from "utils/useDataAPI";
import { getFilterRangeValues } from "utils";
import { useModal } from "react-modal-hook";
import ResponsiveModal from 'components/Modal';
import YScroll from 'components/YScroll';
import { LayoutContext } from "./GridLayout";
import { AppContext } from "./App";
import { RangeDateField } from 'components/FormFields';
import DownloadReport from 'components/DownloadReportsV2';
import DataTable from './DataTable';

/* ─── Pic Viewer ─── */
const Pic = ({ path }) => (
    <div className="flex justify-center p-6">
        <Image src={path} className="rounded-xl shadow-xl" style={{ maxHeight: '70vh' }} />
    </div>
);

/* ─── Section Header ─── */
const SectionHeader = ({ title, subtitle, icon: Icon, count, action }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
            {Icon && (
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Icon size={18} className="text-blue-600" />
                </div>
            )}
            <div>
                <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            {count !== undefined && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{count}</span>
            )}
        </div>
        {action}
    </div>
);

/* ─── Biometrias ─── */
const Biometrias = ({ openNotification }) => {
    const dataAPI = useDataAPI({
        payload: {
            url: `${API_URL}/rponto/sqlp/`,
            withCredentials: true,
            parameters: { method: "BiometriasList" },
            pagination: { enabled: false },
            filter: {},
            sort: []
        }
    });
    const submitting = useSubmitting(false);
    const [modalParameters, setModalParameters] = useState({});
    const [showModal, hideModal] = useModal(
        () => (
            <ResponsiveModal title={modalParameters?.title} onCancel={hideModal} width={modalParameters.width} footer="ref" yScroll>
                <Pic path={modalParameters.path} />
            </ResponsiveModal>
        ),
        [modalParameters]
    );

    useEffect(() => { dataAPI.fetchPost(); }, []);

    const syncAll = async () => {
        submitting.trigger();
        try {
            await fetchPost({ url: `${API_URL}/rponto/sqlp/`, withCredentials: true, parameters: { method: "Sync" } });
            openNotification("success", 'top', "Sincronização", "Dados sincronizados com sucesso!");
            dataAPI.fetchPost();
        } catch (e) {
            openNotification("error", 'top', "Erro", e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <SectionHeader
                title="Biometrias Registadas"
                subtitle="Fotografias de reconhecimento facial"
                count={dataAPI.rows?.length}
                action={
                    <Button onClick={syncAll} loading={submitting.state} icon={<SyncOutlined />} type="primary" size="small" className="rounded-lg">
                        Sincronizar
                    </Button>
                }
            />
            {dataAPI.loading && <div className="flex justify-center items-center p-12"><Spin size="large" /></div>}
            {!dataAPI.loading && (!dataAPI.rows || dataAPI.rows.length === 0) && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <CameraOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                    <p className="font-medium">Nenhuma biometria encontrada</p>
                </div>
            )}
            {!dataAPI.loading && dataAPI.rows?.length > 0 && (
                <YScroll>
                    <div className="p-4 space-y-2">
                        {dataAPI.rows.map((r, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                                <button
                                    onClick={() => {
                                        setModalParameters({ title: "Visualizar Biometria", path: `${FILES_URL}/static/faces/${r.file}`, width: "500px" });
                                        showModal();
                                    }}
                                    className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                                >
                                    <img src={`${FILES_URL}/static/faces/${r.file}`} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} alt="Biometria" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm">{r.num}</p>
                                    <p className="text-xs text-slate-500 font-mono truncate">{r.file}</p>
                                </div>
                                <p className="text-xs text-slate-400 shrink-0">{dayjs(r.t_stamp).format(DATETIME_FORMAT)}</p>
                            </div>
                        ))}
                    </div>
                </YScroll>
            )}
        </div>
    );
};

/* ─── Invalid Records ─── */
const InvalidRecords = ({ openNotification }) => {
    const [formFilter] = Form.useForm();
    const dataAPI = useDataAPI({
        payload: {
            url: `${API_URL}/rponto/sqlp/`,
            withCredentials: true,
            parameters: { method: "InvalidRecordsList" },
            pagination: { enabled: false },
            filter: { fdata: [`>=${dayjs().format(DATE_FORMAT)}`, `<=${dayjs().format(DATE_FORMAT)}`] }
        }
    });

    const rowFn = async (dt) => {
        const _dt = [];
        if (!dt?.rows) return { rows: [] };
        dt.rows.forEach((x, i) => {
            const v = x.filename.replace("../", "").replace("./", "");
            const r = v.split('/');
            if (r.length >= 3) {
                let _f = r[r.length - 1].split('.');
                _dt.push({ k: i, name: `${_f[0]}.${_f[1]}`, path: `${FILES_URL}/static/${v}`, num: r.length === 4 ? r[2] : null, type: _f[2] });
            }
        });
        return { rows: _dt };
    };

    useEffect(() => { dataAPI.fetchPost({ rowFn }); }, []);

    const handleFilter = (values) => {
        dataAPI.addFilters({ ...values, fdata: getFilterRangeValues(values["fdata"]?.formatted) }, true);
        dataAPI.fetchPost({ rowFn });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <SectionHeader title="Registos Inválidos" subtitle="Capturas sem identificação válida" />
            <div className="px-4 py-3 bg-white border-b border-slate-100">
                <Form form={formFilter} layout="inline" onFinish={handleFilter}>
                    <Form.Item name="fnum" className="mb-0">
                        <Input placeholder="Nº colaborador" size="small" style={{ width: 130 }} prefix={<UserOutlined className="text-slate-400" />} />
                    </Form.Item>
                    <Form.Item name="fdata" className="mb-0">
                        <RangeDateField size="small" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<FilterOutlined />} size="small" className="rounded-lg">Filtrar</Button>
                </Form>
            </div>
            {dataAPI.loading && <div className="flex justify-center items-center p-12"><Spin size="large" /></div>}
            {!dataAPI.loading && (!dataAPI.rows || dataAPI.rows.length === 0) && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <WarningOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                    <p className="font-medium">Sem registos inválidos</p>
                </div>
            )}
            {!dataAPI.loading && dataAPI.rows?.length > 0 && (
                <YScroll>
                    <div className="p-4 space-y-2">
                        {dataAPI.rows.map((r) => (
                            <div key={r.k} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all">
                                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-amber-200">
                                    <Image src={r.path} width={48} height={48} className="object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-amber-700 text-sm">{r.num || <span className="text-slate-400 font-normal italic">Sem número</span>}</p>
                                    <p className="text-xs text-slate-500 font-mono truncate">{r.name}</p>
                                </div>
                                {r.type && (
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${r.type === 'in' ? 'bg-green-100 text-green-700' : r.type === 'out' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {r.type === 'in' ? 'Entrada' : r.type === 'out' ? 'Saída' : r.type}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </YScroll>
            )}
        </div>
    );
};



const DateTime24Input = ({ value, onChange, disabled }) => {
    const parse = (v) => {
        if (!v) return { date: '', hour: '', min: '' };
        const s = String(v).trim().replace('T', ' ');
        const [d = '', t = ''] = s.split(' ');
        const [h = '', m = ''] = t.split(':');
        return {
            date: d,
            hour: h.padStart(2, '0'),
            min:  m.padStart(2, '0')
        };
    };

    const { date, hour, min } = parse(value);

    const emit = (newDate, newHour, newMin) => {
        const d = newDate  !== undefined ? newDate  : date;
        const h = newHour  !== undefined ? newHour  : hour;
        const m = newMin   !== undefined ? newMin   : min;
        if (!d && !h && !m) { onChange(null); return; }
        onChange(`${d || ''}T${(h || '00').padStart(2,'0')}:${(m || '00').padStart(2,'0')}`);
    };

    const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const selectCls = `px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 cursor-pointer`;

    return (
        <div className="flex items-center gap-1">
            {/* Data */}
            <input
                type="date"
                value={date}
                disabled={disabled}
                onChange={e => emit(e.target.value, undefined, undefined)}
                className={`flex-1 ${selectCls}`}
            />

            {/* Separador */}
            <span className="text-slate-400 font-bold text-sm shrink-0">às</span>

            {/* Horas */}
            <select
                value={hour}
                disabled={disabled}
                onChange={e => emit(undefined, e.target.value, undefined)}
                className={`w-[62px] ${selectCls}`}
            >
                <option value="">HH</option>
                {hours.map(h => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>

            <span className="text-slate-400 font-bold shrink-0">:</span>

            {/* Minutos */}
            <select
                value={min}
                disabled={disabled}
                onChange={e => emit(undefined, undefined, e.target.value)}
                className={`w-[62px] ${selectCls}`}
            >
                <option value="">MM</option>
                {minutes.map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
};

/* ─── Fix Record ─── */
const FixRecord = ({ record, openNotification, onSave, onCancel }) => {
    const submitting = useSubmitting(false);
    const [formStatus, setFormStatus] = useState({ error: [] });
    const [picagens, setPicagens] = useState([]);

    const typeOptions = [
        { value: "", label: "— Não definido —" },
        { value: "in", label: "Entrada" },
        { value: "out", label: "Saída" }
    ];

    // Inicializa o array de picagens a partir do record
    useEffect(() => {
        if (!record) return;
        const items = [];
        for (let i = 1; i <= 8; i++) {
            const padded = String(i).padStart(2, '0');
            const ss = record[`ss_${padded}`];
            const ty = record[`ty_${padded}`];
            if (ss || ty) {
                // Normaliza para YYYY-MM-DDTHH:MM
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

    const removePicagem = (idx) => {
        setPicagens(prev => {
            const next = prev.filter((_, i) => i !== idx);
            return next.length === 0 ? [{ ss: '', ty: '' }] : next;
        });
    };

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

            // Construir registo actualizado para patch na tabela (sem refresh)
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
                </div>
            </div>

            {formStatus.error.length > 0 && (
                <Alert message={formStatus.error.join(", ")} type="error" closable onClose={() => setFormStatus({ error: [] })} className="mx-4 mt-4" />
            )}

            <YScroll className="flex-1">
                <div className="p-5">
                    <Spin spinning={submitting.state}>
                        {/* Header da secção */}
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Picagens do dia</span>
                            {picagens.length < 8 && (
                                <button
                                    onClick={addPicagem}
                                    disabled={submitting.state}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                                >
                                    <PlusOutlined /> Adicionar
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {picagens.map((p, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                                    {/* Badge de posição */}
                                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mt-1 shrink-0">
                                        {idx + 1}
                                    </span>

                                    {/* Inputs */}
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
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700
                                                           focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                                            >
                                                {typeOptions.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Controlos de ordem / remover */}
                                    <div className="flex flex-col gap-1 shrink-0 mt-1">
                                        <button
                                            onClick={() => moveUp(idx)}
                                            disabled={idx === 0 || submitting.state}
                                            title="Mover para cima"
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowUpOutlined style={{ fontSize: 11 }} />
                                        </button>
                                        <button
                                            onClick={() => moveDown(idx)}
                                            disabled={idx === picagens.length - 1 || submitting.state}
                                            title="Mover para baixo"
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowDownOutlined style={{ fontSize: 11 }} />
                                        </button>
                                        <button
                                            onClick={() => removePicagem(idx)}
                                            disabled={submitting.state}
                                            title="Remover"
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-20 transition-colors"
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
                <Button onClick={onCancel} icon={<CloseOutlined />} className="rounded-lg">Cancelar</Button>
                <Button type="primary" onClick={handleSave} loading={submitting.state} icon={<SaveOutlined />} className="rounded-lg bg-blue-600 border-0 hover:bg-blue-700">
                    Guardar alterações
                </Button>
            </div>
        </div>
    );
};

/* ─── Page Header ─── */
const PageHeader = ({ title, subtitle }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-black text-slate-800">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

/* ─── Picagem Type Filter ─── */
const PicagemTypeFilter = ({ value, onChange }) => {
    const options = [
        { key: 'all',  label: 'Todas',    icon: <SwapOutlined />,   active: 'bg-slate-800 text-white',  inactive: 'bg-white text-slate-600 hover:bg-slate-50' },
        { key: 'in',   label: 'Entradas', icon: <LoginOutlined />,  active: 'bg-green-600 text-white',  inactive: 'bg-white text-slate-600 hover:bg-green-50' },
        { key: 'out',  label: 'Saídas',   icon: <LogoutOutlined />, active: 'bg-red-500 text-white',    inactive: 'bg-white text-slate-600 hover:bg-red-50' },
    ];
    return (
        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            {options.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-r border-slate-200 last:border-r-0 ${value === opt.key ? opt.active : opt.inactive}`}
                >
                    {opt.icon} {opt.label}
                </button>
            ))}
        </div>
    );
};

/* ─── MAIN COMPONENT ─── */
export default function RegistosRHv3() {
    const { openNotification } = useContext(LayoutContext);
    const { auth } = useContext(AppContext);
    const [showBiometrias, setShowBiometrias] = useState(false);
    const [showInvalidRecords, setShowInvalidRecords] = useState(false);
    const [showFix, setShowFix] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');

    // Referência para a função patchRow exposta pelo DataTable
    const patchRowRef = useRef(null);

    const handleRegisterPatch = useCallback((fn) => {
        patchRowRef.current = fn;
    }, []);

    // Chave de linha para identificar o registo no patch
    const rowKey = (row) => `${row?.num}|${String(row?.dts || '').slice(0, 10)}`;

    // Após guardar no drawer, aplica patch na linha da tabela sem refetch
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

    const isPicagemVisible = useCallback((typeVal, hasValue) => {
        if (!hasValue) return false;
        if (typeFilter === 'all') return true;
        const t = typeVal ? String(typeVal).trim().toLowerCase() : null;
        if (typeFilter === 'in')  return t === 'in';
        if (typeFilter === 'out') return t === 'out';
        return true;
    }, [typeFilter]);

    const columns = useMemo(() => [
        {
            title: 'Colaborador',
            dataIndex: 'num',
            sticky: true,
            className: 'left-0',
            style: { left: 0, minWidth: 180 },
            render: (val, row) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                        {String(val).slice(-2)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{row.nome_colaborador || `Nº ${val}`}</p>
                        <p className="text-[10px] text-slate-400">Nº {val}</p>
                    </div>
                </div>
            )
        },
        {
            title: 'Data',
            dataIndex: 'dts',
            style: { minWidth: 100 },
            render: (val) => (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                    {dayjs(val).format('DD/MM/YYYY')}
                </span>
            )
        },
        {
            title: () => (
                <span className="inline-flex items-center gap-1">
                    Picagens
                    {typeFilter !== 'all' && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${typeFilter === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {typeFilter === 'in' ? 'ENT' : 'SAÍ'}
                        </span>
                    )}
                </span>
            ),
            dataIndex: 'nt',
            style: { minWidth: 90, textAlign: 'center' },
            render: (val, row) => {
                let visible = typeFilter === 'all' ? (val || 0) : 0;
                if (typeFilter !== 'all') {
                    for (let i = 1; i <= 8; i++) {
                        const padded = String(i).padStart(2, '0');
                        if (row[`ss_${padded}`] && isPicagemVisible(row[`ty_${padded}`], true)) visible++;
                    }
                }
                return (
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${typeFilter === 'in' ? 'bg-green-50 text-green-700' : typeFilter === 'out' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {visible}
                    </span>
                );
            }
        },
        ...[...Array(8)].map((_, i) => ({
            title: `P${i + 1}`,
            dataIndex: `ss_${String(i + 1).padStart(2, '0')}`,
            style: { minWidth: 90, textAlign: 'center' },
            render: (val, row) => {
                const typeVal = row[`ty_${String(i + 1).padStart(2, '0')}`];
                const type = typeVal ? String(typeVal).trim().toLowerCase() : null;
                if (!isPicagemVisible(typeVal, !!val)) {
                    return <span className="text-slate-200 text-[10px]">—</span>;
                }
                return (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap
                        ${type === 'in' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
                          type === 'out' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                          'bg-slate-50 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${type === 'in' ? 'bg-green-500' : type === 'out' ? 'bg-red-500' : 'bg-slate-400'}`} />
                        {dayjs(val).format('HH:mm')}
                    </div>
                );
            }
        }))
    ], [typeFilter, isPicagemVisible]);

    const toolbarButtons = useCallback((filters) => (
        <div className="flex items-center gap-2 flex-wrap">
            <DownloadReport filters={filters} />
            <PicagemTypeFilter value={typeFilter} onChange={setTypeFilter} />
            <button onClick={() => setShowBiometrias(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                <CameraOutlined /> Biometrias
            </button>
            <button onClick={() => setShowInvalidRecords(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                <WarningOutlined /> Inválidos
            </button>
        </div>
    ), [typeFilter]);

    const filterFields = useMemo(() => [
        { name: 'fnum', label: 'Número', component: <Input placeholder="Ex: 123" size="middle" style={{ width: 130 }} /> },
        { name: 'fdata', label: 'Período', component: <RangeDateField size="middle" /> }
    ], []);

    // ⚠️ CRÍTICO: memoizar apiConfig para evitar re-renders infinitos no DataTable
    const apiConfig = useMemo(() => ({
        url: `${API_URL}/rponto/sqlp/`,
        method: 'RegistosRH',
        extraFilter: {
            isRH:             auth?.isRH    || false,
            isAdmin:          auth?.isAdmin || false,
            isChefe:          auth?.isChefe || false,
            deps_chefe:       auth?.deps_chefe || [],
            num:              auth?.num ?? '',
            isPicagensV3List: true,
        },
    }), [auth?.isRH, auth?.isAdmin, auth?.isChefe, auth?.deps_chefe, auth?.num]);

    const defaultSort = useMemo(() => [
        { column: "dts", direction: "DESC" },
        { column: "num", direction: "ASC" }
    ], []);

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="Registo de Picagens"
                subtitle="Consulta e gestão dos registos de entrada e saída"
            />

            <div className="flex-1 min-h-0">
                <DataTable
                    columns={columns}
                    apiConfig={apiConfig}
                    filterFields={filterFields}
                    defaultSort={defaultSort}
                    onRowEdit={(row) => { setSelectedRecord(row); setShowFix(true); }}
                    toolbarButtons={toolbarButtons}
                    pageSize={20}
                    openNotification={openNotification}
                    onRegisterPatch={handleRegisterPatch}
                />
            </div>

            {/* Biometrias Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><CameraOutlined className="text-blue-500" /> Biometrias</div>}
                width={720} open={showBiometrias} onClose={() => setShowBiometrias(false)}
                destroyOnClose bodyStyle={{ padding: 0, background: '#f8fafc' }}
            >
                <Biometrias openNotification={openNotification} />
            </Drawer>

            {/* Invalid Records Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><WarningOutlined className="text-amber-500" /> Registos Inválidos</div>}
                width={720} open={showInvalidRecords} onClose={() => setShowInvalidRecords(false)}
                destroyOnClose bodyStyle={{ padding: 0, background: '#f8fafc' }}
            >
                <InvalidRecords openNotification={openNotification} />
            </Drawer>

            {/* Fix Record Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><ExclamationCircleOutlined className="text-red-500" /> Corrigir Registo</div>}
                width={700} open={showFix}
                onClose={() => { setShowFix(false); setSelectedRecord(null); }}
                destroyOnClose bodyStyle={{ padding: 0, background: '#f8fafc' }}
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