import React, { useContext, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Drawer, Input, Image, Form, Button, Space, Alert, Spin, Empty, Badge } from 'antd';
import {
    CameraOutlined, SearchOutlined, SyncOutlined, SaveOutlined,
    CloseOutlined, UserOutlined, WarningOutlined, ExclamationCircleOutlined,
    FilterOutlined, ReloadOutlined
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
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    {count}
                </span>
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
                    <Button
                        onClick={syncAll}
                        loading={submitting.state}
                        icon={<SyncOutlined />}
                        type="primary"
                        size="small"
                        className="rounded-lg"
                    >
                        Sincronizar
                    </Button>
                }
            />

            {dataAPI.loading && (
                <div className="flex justify-center items-center p-12">
                    <Spin size="large" />
                </div>
            )}

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
                                    <img
                                        src={`${FILES_URL}/static/faces/${r.file}`}
                                        className="w-full h-full object-cover"
                                        onError={e => { e.target.style.display = 'none'; }}
                                        alt="Biometria"
                                    />
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

            {/* Filter Bar */}
            <div className="px-4 py-3 bg-white border-b border-slate-100">
                <Form form={formFilter} layout="inline" onFinish={handleFilter}>
                    <Form.Item name="fnum" className="mb-0">
                        <Input placeholder="Nº colaborador" size="small" style={{ width: 130 }} prefix={<UserOutlined className="text-slate-400" />} />
                    </Form.Item>
                    <Form.Item name="fdata" className="mb-0">
                        <RangeDateField size="small" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<FilterOutlined />} size="small" className="rounded-lg">
                        Filtrar
                    </Button>
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

/* ─── Fix Record ─── */
const FixRecord = ({ record, openNotification, onSave, onCancel }) => {
    const [form] = Form.useForm();
    const submitting = useSubmitting(false);
    const [formStatus, setFormStatus] = useState({ error: [] });

    const typeOptions = [
        { value: "", label: "— Não definido —" },
        { value: "in", label: "Entrada" },
        { value: "out", label: "Saída" }
    ];

    useEffect(() => {
        if (!record) return;
        form.setFieldsValue({
            num: record.num,
            dts: record.dts ? dayjs(record.dts).format(DATE_FORMAT) : '',
            ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [
                `ss_${String(i).padStart(2, '0')}`,
                record[`ss_${String(i).padStart(2, '0')}`] ? dayjs(record[`ss_${String(i).padStart(2, '0')}`]) : null
            ])),
            ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [
                `ty_${String(i).padStart(2, '0')}`,
                record[`ty_${String(i).padStart(2, '0')}`]?.trim() || null
            ]))
        });
    }, [record, form]);

    const handleSave = async (values) => {
        submitting.trigger();
        try {
            const payload = {
                ...values,
                dts: values.dts,
                ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [
                    `ss_${String(i).padStart(2, '0')}`,
                    values[`ss_${String(i).padStart(2, '0')}`]?.format?.(DATETIME_FORMAT) || null
                ]))
            };
            await fetchPost({ url: `${API_URL}/rponto/sqlp/`, withCredentials: true, body: { method: "UpdatePicagem", data: payload } });
            openNotification("success", 'top', "Sucesso", "Registo actualizado com sucesso!");
            onSave();
        } catch (e) {
            setFormStatus({ error: [e.message] });
            openNotification("error", 'top', "Erro", e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Record Info Header */}
            <div className="px-5 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {record?.num}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">{record?.SRN_0} {record?.NAM_0}</p>
                        <p className="text-xs text-slate-500">{record?.dts ? dayjs(record.dts).format(DATE_FORMAT) : '—'}</p>
                    </div>
                </div>
            </div>

            {formStatus.error.length > 0 && (
                <Alert message={formStatus.error.join(", ")} type="error" closable onClose={() => setFormStatus({ error: [] })} className="mx-4 mt-4" />
            )}

            <YScroll className="flex-1">
                <div className="p-5">
                    <Spin spinning={submitting.state}>
                        <Form form={form} layout="vertical" onFinish={handleSave} disabled={submitting.state}>
                            {/* Hidden fields */}
                            <Form.Item name="num" hidden><Input /></Form.Item>
                            <Form.Item name="dts" hidden><Input /></Form.Item>

                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Picagens do dia</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                    const padded = String(i).padStart(2, '0');
                                    return (
                                        <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{i}</span>
                                                <span className="text-sm font-semibold text-slate-700">Picagem {padded}</span>
                                            </div>
                                            <Form.Item name={`ss_${padded}`} className="mb-2">
                                                <Input placeholder="Data e Hora" size="small" type="datetime-local" className="rounded-lg" />
                                            </Form.Item>
                                            <Form.Item name={`ty_${padded}`} className="mb-0">
                                                <select className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    {typeOptions.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </Form.Item>
                                        </div>
                                    );
                                })}
                            </div>
                        </Form>
                    </Spin>
                </div>
            </YScroll>

            <div className="shrink-0 p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
                <Button onClick={onCancel} icon={<CloseOutlined />} className="rounded-lg">Cancelar</Button>
                <Button type="primary" onClick={() => form.submit()} loading={submitting.state} icon={<SaveOutlined />} className="rounded-lg bg-blue-600 border-0 hover:bg-blue-700">
                    Guardar alterações
                </Button>
            </div>
        </div>
    );
};

/* ─── Page Header ─── */
const PageHeader = ({ title, subtitle, actions }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-black text-slate-800">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);

/* ─── MAIN COMPONENT ─── */
export default function RegistosRHv3() {
    const { openNotification } = useContext(LayoutContext);
    const [showBiometrias, setShowBiometrias] = useState(false);
    const [showInvalidRecords, setShowInvalidRecords] = useState(false);
    const [showFix, setShowFix] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const toolbarButtons = (filters) => (
        <div className="flex items-center gap-2">
            <DownloadReport filters={filters} />
            <button
                onClick={() => setShowBiometrias(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
                <CameraOutlined /> Biometrias
            </button>
            <button
                onClick={() => setShowInvalidRecords(true)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
                <WarningOutlined /> Inválidos
            </button>
        </div>
    );

    const columns = [
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
            title: 'Picagens',
            dataIndex: 'nt',
            style: { minWidth: 80, textAlign: 'center' },
            render: (val) => (
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                    {val || 0}
                </span>
            )
        },
        ...[...Array(8)].map((_, i) => ({
            title: `P${i + 1}`,
            dataIndex: `ss_${String(i + 1).padStart(2, '0')}`,
            style: { minWidth: 90, textAlign: 'center' },
            render: (val, row) => {
                const typeVal = row[`ty_${String(i + 1).padStart(2, '0')}`];
                const type = typeVal ? String(typeVal).trim().toLowerCase() : null;
                return val ? (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap
                        ${type === 'in' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
                          type === 'out' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                          'bg-slate-50 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${type === 'in' ? 'bg-green-500' : type === 'out' ? 'bg-red-500' : 'bg-slate-400'}`} />
                        {dayjs(val).format('HH:mm')}
                    </div>
                ) : <span className="text-slate-300 text-[10px]">—</span>;
            }
        }))
    ];

    const filterFields = [
        {
            name: 'fnum',
            label: 'Número',
            component: <Input placeholder="Ex: 123" size="middle" style={{ width: 130 }} />
        },
        {
            name: 'fdata',
            label: 'Período',
            component: <RangeDateField size="middle" />
        }
    ];

    const apiConfig = {
        url: `${API_URL}/rponto/sqlp/`,
        method: 'RegistosRH'
    };

    const defaultSort = [
        { column: "dts", direction: "DESC" },
        { column: "num", direction: "ASC" }
    ];

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="Registo de Picagens"
                subtitle="Consulta e gestão dos registos de entrada e saída"
            />

            <div className="flex-1 min-h-0">
                <DataTable
                    key={refreshKey}
                    columns={columns}
                    apiConfig={apiConfig}
                    filterFields={filterFields}
                    defaultSort={defaultSort}
                    onRowEdit={(row) => { setSelectedRecord(row); setShowFix(true); }}
                    toolbarButtons={toolbarButtons}
                    pageSize={20}
                    openNotification={openNotification}
                />
            </div>

            {/* Biometrias Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><CameraOutlined className="text-blue-500" /> Biometrias</div>}
                width={720}
                open={showBiometrias}
                onClose={() => setShowBiometrias(false)}
                destroyOnClose
                bodyStyle={{ padding: 0, background: '#f8fafc' }}
            >
                <Biometrias openNotification={openNotification} />
            </Drawer>

            {/* Invalid Records Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><WarningOutlined className="text-amber-500" /> Registos Inválidos</div>}
                width={720}
                open={showInvalidRecords}
                onClose={() => setShowInvalidRecords(false)}
                destroyOnClose
                bodyStyle={{ padding: 0, background: '#f8fafc' }}
            >
                <InvalidRecords openNotification={openNotification} />
            </Drawer>

            {/* Fix Record Drawer */}
            <Drawer
                title={<div className="flex items-center gap-2 font-bold text-slate-800"><ExclamationCircleOutlined className="text-red-500" /> Corrigir Registo</div>}
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
                        onSave={() => { setShowFix(false); setSelectedRecord(null); setRefreshKey(k => k + 1); }}
                        onCancel={() => { setShowFix(false); setSelectedRecord(null); }}
                    />
                )}
            </Drawer>
        </div>
    );
}