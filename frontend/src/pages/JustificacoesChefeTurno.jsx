import React, { useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Form, Input, Select, Tag, Modal, Empty,
    Spin, Alert, Drawer, Avatar, Divider, DatePicker,
    Card, Table, Space, Tooltip, Badge, Upload, Typography
} from 'antd';
import {
    PlusOutlined, CheckOutlined, CloseOutlined, FilePdfOutlined,
    UserOutlined, CalendarOutlined, FileTextOutlined,
    ClockCircleOutlined, FilterOutlined, TeamOutlined,
    UploadOutlined, EyeOutlined, ReloadOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL } from "config";
import { AppContext } from "./App";
import { LayoutContext } from "./GridLayout";
import { RangeDateField } from 'components/FormFields';
import { getFilterRangeValues } from "utils";
import YScroll from 'components/YScroll';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const STATUS_CONFIG = {
    0: { label: 'Pendente (Chefe Dep.)', color: 'orange' },
    1: { label: 'Aguarda RH',            color: 'blue'   },
    2: { label: 'Aprovado',              color: 'green'  },
    3: { label: 'Rejeitado pelo Chefe',  color: 'red'    },
    4: { label: 'Rejeitado pelo RH',     color: 'red'    },
};

/* ══════════════════════════════════════════════════════════
   MODAL — Nova Justificação (Chefe de Turno)
   ══════════════════════════════════════════════════════════ */
const NovaJustificacaoModal = ({ open, onClose, onSuccess, numChefeTurno }) => {
    const { openNotification } = useContext(LayoutContext);
    const [form]               = Form.useForm();
    const submitting           = useSubmitting(false);
    const [colaboradores, setColaboradores] = useState([]);
    const [motivos, setMotivos]             = useState([]);
    const [loadingColabs, setLoadingColabs] = useState(false);
    const [pdfFile, setPdfFile]             = useState(null);

    // Carregar colaboradores da equipa
    useEffect(() => {
        if (open && numChefeTurno) {
            setLoadingColabs(true);
            fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ColaboradoresEquipaChefeTurno" },
                filter: { num_chefe: numChefeTurno }
            }).then(res => {
                setColaboradores(res.data?.rows || []);
            }).catch(() => {
                setColaboradores([]);
            }).finally(() => setLoadingColabs(false));

            // Carregar motivos
            fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoMotivos" },
                filter: {}
            }).then(res => {
                setMotivos(res.data?.rows || []);
            }).catch(() => setMotivos([]));
        }
    }, [open, numChefeTurno]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            submitting.trigger();

            const [dt_inicio, dt_fim] = values.periodo;

            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoCreateChefeTurno" },
                filter: {
                    num:              values.num,
                    num_chefe_turno:  numChefeTurno,
                    dt_inicio:        dt_inicio.format('YYYY-MM-DD'),
                    dt_fim:           dt_fim.format('YYYY-MM-DD'),
                    motivo_codigo:    values.motivo_codigo,
                    descricao:        values.descricao || ''
                }
            });

            if (res.data.status === 'success') {
                // Upload PDF se existir
                if (pdfFile && res.data.id) {
                    const formData = new FormData();
                    formData.append('id', res.data.id);
                    formData.append('pdf', pdfFile);
                    try {
                        await fetchPost({
                            url: `${API_URL}/rponto/justificacoes/upload/`,
                            withCredentials: true,
                            formData: formData
                        });
                    } catch (e) {
                        console.warn("Upload PDF falhou:", e);
                    }
                }

                openNotification('success', 'top', 'Sucesso', res.data.title);
                form.resetFields();
                setPdfFile(null);
                onSuccess();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            if (e.errorFields) return; // validação do form
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <PlusOutlined className="text-blue-500" />
                    <span>Nova Justificação (Chefe de Turno)</span>
                </div>
            }
            open={open}
            onCancel={() => { form.resetFields(); setPdfFile(null); onClose(); }}
            width={600}
            destroyOnClose
            footer={[
                <Button key="cancel" onClick={onClose}>Cancelar</Button>,
                <Button key="submit" type="primary" loading={submitting.state}
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700">
                    Submeter Justificação
                </Button>
            ]}
        >
            <Form form={form} layout="vertical" className="mt-4">
                {/* Colaborador */}
                <Form.Item
                    name="num" label="Colaborador"
                    rules={[{ required: true, message: 'Selecione o colaborador' }]}
                >
                    <Select
                        placeholder="Selecione o colaborador..."
                        loading={loadingColabs}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {colaboradores.map(c => (
                            <Select.Option key={c.num} value={c.num}>
                                {c.num} — {c.nome || 'Sem nome'} (Equipa {c.equipa})
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* Período */}
                <Form.Item
                    name="periodo" label="Período"
                    rules={[{ required: true, message: 'Selecione o período' }]}
                >
                    <RangePicker
                        format="YYYY-MM-DD"
                        className="w-full"
                        placeholder={['Data Início', 'Data Fim']}
                    />
                </Form.Item>

                {/* Motivo */}
                <Form.Item
                    name="motivo_codigo" label="Motivo"
                    rules={[{ required: true, message: 'Selecione o motivo' }]}
                >
                    <Select placeholder="Selecione o motivo...">
                        {motivos.map(m => (
                            <Select.Option key={m.codigo} value={m.codigo}>
                                {m.descricao}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* Descrição */}
                <Form.Item name="descricao" label="Observações">
                    <TextArea rows={3} placeholder="Observações adicionais..." />
                </Form.Item>

                {/* PDF */}
                <Form.Item label="Documento Comprovativo (opcional)">
                    <Upload
                        beforeUpload={(file) => {
                            setPdfFile(file);
                            return false; // impedir upload automático
                        }}
                        onRemove={() => setPdfFile(null)}
                        maxCount={1}
                        accept=".pdf,.jpg,.jpeg,.png"
                        fileList={pdfFile ? [{
                            uid: '-1',
                            name: pdfFile.name,
                            status: 'done'
                        }] : []}
                    >
                        <Button icon={<UploadOutlined />}>
                            Anexar ficheiro (PDF, JPG, PNG)
                        </Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    );
};

/* ══════════════════════════════════════════════════════════
   DRAWER — Detalhe da Justificação
   ══════════════════════════════════════════════════════════ */
const DetalheDrawer = ({ item, open, onClose }) => {
    if (!item) return null;

    const statusCfg = STATUS_CONFIG[item.status] || { label: '?', color: 'default' };

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-blue-500" />
                    <span>Detalhe #{item.id}</span>
                </div>
            }
            width={480} open={open} onClose={onClose} destroyOnClose
        >
            <div className="space-y-4">
                {/* Info colaborador */}
                <Card size="small" className="bg-gray-50">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><Text type="secondary">Colaborador:</Text></div>
                        <div><Text strong>{item.num}</Text> — {item.nome_colaborador}</div>

                        <div><Text type="secondary">Equipa:</Text></div>
                        <div><Tag>{item.tp_hor || '—'}</Tag></div>

                        <div><Text type="secondary">Período:</Text></div>
                        <div>{item.dt_inicio} → {item.dt_fim}</div>

                        <div><Text type="secondary">Motivo:</Text></div>
                        <div>{item.motivo_descricao || item.motivo_codigo}</div>

                        <div><Text type="secondary">Status:</Text></div>
                        <div><Tag color={statusCfg.color}>{statusCfg.label}</Tag></div>
                    </div>
                </Card>

                {/* Descrição */}
                {item.descricao && (
                    <Card size="small" title="Observações">
                        <Text>{item.descricao}</Text>
                    </Card>
                )}

                {/* PDF */}
                {item.pdf_filename && (
                    <Card size="small" title="Documento">
                        <a
                            href={`${API_URL}/rponto/justificacoes/download/${item.id}/`}
                            target="_blank" rel="noopener noreferrer"
                        >
                            <Button icon={<FilePdfOutlined />} type="link">
                                {item.pdf_filename}
                            </Button>
                        </a>
                    </Card>
                )}

                {/* Aprovações */}
                <Card size="small" title="Histórico de Aprovação">
                    <div className="text-sm space-y-2">
                        <div>
                            <Text type="secondary">Chefe de Turno: </Text>
                            <Text>{item.num_chefe || '—'}</Text>
                            {item.dt_chefe && <Text type="secondary"> ({item.dt_chefe})</Text>}
                        </div>
                        {item.obs_chefe && <div className="pl-4 text-gray-500">"{item.obs_chefe}"</div>}

                        <Divider className="my-2" />

                        <div>
                            <Text type="secondary">Chefe Dep.: </Text>
                            <Text>{item.status >= 1 ? (item.status_chefe === 1 ? '✓ Aprovado' : item.status_chefe === 2 ? '✗ Rejeitado' : 'Pendente') : 'Pendente'}</Text>
                        </div>

                        <div>
                            <Text type="secondary">RH: </Text>
                            <Text>{item.status_rh === 1 ? '✓ Aprovado' : item.status_rh === 2 ? '✗ Rejeitado' : 'Pendente'}</Text>
                            {item.dt_rh && <Text type="secondary"> ({item.dt_rh})</Text>}
                        </div>
                        {item.obs_rh && <div className="pl-4 text-gray-500">"{item.obs_rh}"</div>}
                    </div>
                </Card>

                {/* Submissão */}
                <div className="text-xs text-gray-400 text-right">
                    Submetido em {item.dt_submissao}
                </div>
            </div>
        </Drawer>
    );
};

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — JustificacoesChefeTurno
   ══════════════════════════════════════════════════════════ */
export default ({ extraRef, closeSelf, loadParentData, noid, ...props }) => {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const [loading, setLoading]               = useState(false);
    const [data, setData]                     = useState([]);
    const [total, setTotal]                   = useState(0);
    const [page, setPage]                     = useState(1);
    const [pageSize, setPageSize]             = useState(20);
    const [modalOpen, setModalOpen]           = useState(false);
    const [drawerOpen, setDrawerOpen]         = useState(false);
    const [selectedItem, setSelectedItem]     = useState(null);

    // Filtros
    const [filterNum, setFilterNum]       = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDates, setFilterDates]   = useState(null);

    const numChefeTurno = auth?.num || auth?.numero || '';
    const equipasChefeTurno = auth?.equipas_chefeturno || [];

    const loadData = useCallback(async (pg = page) => {
        setLoading(true);
        try {
            const filter = {
                num_chefe_turno: numChefeTurno,
            };
            if (filterNum)    filter.fnum    = filterNum;
            if (filterStatus !== '') filter.fstatus = filterStatus;
            if (filterDates && filterDates.length === 2) {
                filter.fdata = [
                    `>=${filterDates[0].format('YYYY-MM-DD')}`,
                    `<=${filterDates[1].format('YYYY-MM-DD')}`
                ];
            }

            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacoesListChefeTurno" },
                filter,
                pagination: { enabled: true, page: pg, pageSize }
            });

            if (res.data.status === 'success') {
                setData(res.data.rows || []);
                setTotal(res.data.total || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [numChefeTurno, filterNum, filterStatus, filterDates, page, pageSize]);

    useEffect(() => { loadData(1); setPage(1); }, [filterNum, filterStatus, filterDates]);
    useEffect(() => { loadData(page); }, [page]);

    const columns = [
        {
            title: '#', dataIndex: 'id', width: 60,
            render: v => <Text strong>#{v}</Text>
        },
        {
            title: 'Colaborador', dataIndex: 'num', width: 200,
            render: (v, r) => (
                <div>
                    <Text strong>{v}</Text>
                    <div className="text-xs text-gray-400">{r.nome_colaborador || ''}</div>
                </div>
            )
        },
        {
            title: 'Equipa', dataIndex: 'tp_hor', width: 80,
            render: v => <Tag>{v}</Tag>
        },
        {
            title: 'Período', key: 'periodo', width: 180,
            render: (_, r) => `${r.dt_inicio} → ${r.dt_fim}`
        },
        {
            title: 'Motivo', dataIndex: 'motivo_descricao', width: 160,
            render: v => v || '—'
        },
        {
            title: 'Estado', dataIndex: 'status', width: 160,
            render: v => {
                const cfg = STATUS_CONFIG[v] || { label: '?', color: 'default' };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            }
        },
        {
            title: 'PDF', dataIndex: 'pdf_filename', width: 60, align: 'center',
            render: (v, r) => v ? (
                <a href={`${API_URL}/rponto/justificacoes/download/${r.id}/`}
                   target="_blank" rel="noopener noreferrer">
                    <FilePdfOutlined className="text-red-500 text-lg" />
                </a>
            ) : '—'
        },
        {
            title: 'Data Subm.', dataIndex: 'dt_submissao', width: 140,
            render: v => v ? v.slice(0, 10) : '—'
        },
        {
            title: '', key: 'acoes', width: 60, align: 'center',
            render: (_, r) => (
                <Tooltip title="Ver detalhe">
                    <Button type="text" icon={<EyeOutlined />}
                            onClick={() => { setSelectedItem(r); setDrawerOpen(true); }} />
                </Tooltip>
            )
        }
    ];

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <TeamOutlined className="text-2xl text-blue-500" />
                    <div>
                        <Title level={4} className="!mb-0">Justificações — Chefe de Turno</Title>
                        <Text type="secondary">
                            Equipas: {equipasChefeTurno.length > 0
                                ? equipasChefeTurno.join(', ')
                                : 'Nenhuma'}
                        </Text>
                    </div>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => loadData(page)}>
                        Atualizar
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => setModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700">
                        Nova Justificação
                    </Button>
                </Space>
            </div>

            {/* Filtros */}
            <Card size="small" className="mb-4">
                <div className="flex gap-4 flex-wrap items-end">
                    <div>
                        <Text type="secondary" className="text-xs">Colaborador</Text>
                        <Input
                            placeholder="Nº funcionário..."
                            value={filterNum}
                            onChange={e => setFilterNum(e.target.value)}
                            allowClear
                            className="w-40"
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">Estado</Text>
                        <Select
                            placeholder="Todos"
                            value={filterStatus}
                            onChange={v => setFilterStatus(v)}
                            allowClear
                            className="w-48"
                        >
                            <Select.Option value="">Todos</Select.Option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <Select.Option key={k} value={k}>
                                    <Tag color={v.color} className="mr-1">{v.label}</Tag>
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">Período</Text>
                        <RangePicker
                            value={filterDates}
                            onChange={v => setFilterDates(v)}
                            format="YYYY-MM-DD"
                            allowClear
                        />
                    </div>
                </div>
            </Card>

            {/* Tabela */}
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 1100 }}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    showSizeChanger: true,
                    showTotal: (t) => `${t} justificações`,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); }
                }}
            />

            {/* Modal Nova Justificação */}
            <NovaJustificacaoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={() => loadData(1)}
                numChefeTurno={numChefeTurno}
            />

            {/* Drawer Detalhe */}
            <DetalheDrawer
                item={selectedItem}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelectedItem(null); }}
            />
        </div>
    );
};